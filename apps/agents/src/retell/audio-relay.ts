import {
  Room,
  RoomEvent,
  AudioStream,
  AudioSource,
  AudioFrame,
  LocalAudioTrack,
  TrackPublishOptions,
  TrackKind,
  type RemoteAudioTrack,
} from '@livekit/rtc-node'
import { createLogger } from '@bipi/shared'

const log = createLogger('agents:retell:relay')

/**
 * Retell's private LiveKit server — all web calls land here.
 * Confirmed via spike test: Retell access_token JWTs have `iss: "APIwRCFuPBawm2h"`
 * and `video.room: "web_call_<id>"` pointing to this URL.
 */
export const RETELL_LIVEKIT_URL = 'wss://retell-ai-4ihahnq7.livekit.cloud'

const SAMPLE_RATE = 24000
const NUM_CHANNELS = 1
const FRAME_SAMPLES = 480 // 20ms at 24kHz

export interface RelayAgent {
  agentId: string      // Supabase agent UUID
  callId: string       // Retell call ID
  accessToken: string  // Retell access_token (LiveKit JWT for Retell cloud)
  agentName: string
  role: 'debater' | 'moderator'
}

/**
 * Controls which routing rules apply in the debate:
 * - opening: moderator leads — mod audio → all agents; debater audio → mod only
 * - debate/closing: full 3-way call — every agent's audio routes to every other agent
 */
export type DebatePhase = 'opening' | 'debate' | 'closing'

interface ConnectedCall {
  meta: RelayAgent
  room: Room
  injectSource: AudioSource  // frames pushed here become "user" audio in this call
}

/**
 * AudioRelay bridges multiple Retell call rooms into a multi-agent debate.
 *
 * For each Retell web call, the relay:
 *   1. Connects as the "client" participant using Retell's access_token
 *   2. Publishes an AudioSource track (Retell agent hears this as "user" speech)
 *   3. Subscribes to the Retell agent's audio output track
 *
 * Opening phase: moderator leads — mod audio goes to all, debater audio goes to
 * mod only so debaters don't hear each other during intro.
 *
 * Debate/closing phase: true 3-way call — every agent's audio is cross-routed
 * to every other agent unconditionally. Natural conversation, no turn enforcement.
 *
 * All audio is also forwarded to a public LiveKit room so the audience can hear.
 *
 * A periodic keepalive sends silent frames to every injectSource to prevent the
 * native AudioSource from entering InvalidState during quiet periods.
 */
export class AudioRelay {
  private calls = new Map<string, ConnectedCall>()
  private publicRooms = new Map<string, Room>()      // agentId → Room (one per agent)
  private publicSources = new Map<string, AudioSource>()
  private stopped = false
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  // Phase controls routing rules (opening = structured; debate/closing = 3-way)
  private phase: DebatePhase = 'opening'

  /**
   * Connect to all Retell call rooms and start cross-routing.
   * publicRoomConfig uses our own LiveKit credentials (not Retell's).
   * Each agent gets its own participant in the public room so LiveKit's
   * ActiveSpeakersChanged event correctly attributes audio to the right agent.
   */
  async connect(
    agents: RelayAgent[],
    publicRoomConfig?: { url: string; tokens: Map<string, string> },
  ): Promise<void> {
    await Promise.all(agents.map((a) => this.connectCall(a)))

    if (publicRoomConfig) {
      await this.connectPublicRoom(publicRoomConfig.url, publicRoomConfig.tokens, agents)
    }

    this.startHeartbeat()
    log.info(`AudioRelay ready: ${agents.length} calls connected`)
  }

  private async connectCall(meta: RelayAgent): Promise<void> {
    const room = new Room()
    const injectSource = new AudioSource(SAMPLE_RATE, NUM_CHANNELS)

    // Join as the "client" (user side) of this Retell call
    await room.connect(RETELL_LIVEKIT_URL, meta.accessToken, {
      autoSubscribe: true,
      dynacast: false,
    })

    // Publish our injection track — Retell's VAD processes this as user speech
    const track = LocalAudioTrack.createAudioTrack('user-audio', injectSource)
    await room.localParticipant!.publishTrack(track, new TrackPublishOptions())

    const conn: ConnectedCall = { meta, room, injectSource }
    this.calls.set(meta.agentId, conn)

    log.info(`Connected to Retell call: ${meta.agentName} (${meta.callId})`)

    // Capture agent audio as tracks appear (Retell agent may publish after connect)
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== TrackKind.KIND_AUDIO) return
      log.info(`Subscribed to agent audio: ${participant.identity} → ${meta.agentName}`)
      this.captureAndRoute(meta.agentId, track as RemoteAudioTrack)
    })

    // Remove stale entry when Retell disconnects the call so future inject
    // attempts don't hit InvalidState on a dead AudioSource.
    room.on(RoomEvent.Disconnected, () => {
      log.info(`Retell call disconnected: ${meta.agentName} (${meta.callId})`)
      this.calls.delete(meta.agentId)
    })
  }

  private async connectPublicRoom(
    baseUrl: string,
    tokens: Map<string, string>,  // agentId → LiveKit token with correct identity
    agents: RelayAgent[],
  ): Promise<void> {
    // Connect as a SEPARATE participant per agent so LiveKit's ActiveSpeakersChanged
    // fires with the correct participant identity. DebateRoom maps identity →
    // agent ID using `agent-${name.toLowerCase().replace(/\s+/g, '-')}`.
    for (const agent of agents) {
      const token = tokens.get(agent.agentId)
      if (!token) continue

      const room = new Room()
      await room.connect(baseUrl, token, { autoSubscribe: false, dynacast: false })

      const src = new AudioSource(SAMPLE_RATE, NUM_CHANNELS)
      const track = LocalAudioTrack.createAudioTrack('voice', src)
      await room.localParticipant!.publishTrack(track, new TrackPublishOptions())

      this.publicRooms.set(agent.agentId, room)
      this.publicSources.set(agent.agentId, src)

      room.on(RoomEvent.Disconnected, () => {
        log.info(`Public room disconnected for ${agent.agentName}`)
        this.publicRooms.delete(agent.agentId)
        this.publicSources.delete(agent.agentId)
      })

      log.info(`Connected ${agent.agentName} to public broadcast room`)
    }
  }

  /**
   * Send silent frames to every injectSource every 4 seconds.
   * The @livekit/rtc-node AudioSource can enter InvalidState if no frames
   * are pushed for an extended period. Silent frames cost no bandwidth
   * (Retell's VAD ignores them) but keep the native PCM pipeline warm.
   */
  private startHeartbeat(): void {
    const silent = new Int16Array(FRAME_SAMPLES) // zeros
    this.heartbeatTimer = setInterval(async () => {
      if (this.stopped) return
      for (const [agentId, conn] of this.calls) {
        try {
          await conn.injectSource.captureFrame(
            new AudioFrame(silent, SAMPLE_RATE, NUM_CHANNELS, FRAME_SAMPLES),
          )
        } catch {
          // Ignore heartbeat failures — safeCaptureFrame handles real audio
          log.warn(`Heartbeat failed for ${agentId}`)
        }
      }
    }, 4_000)
    this.heartbeatTimer.unref?.()
  }

  private captureAndRoute(speakingAgentId: string, track: RemoteAudioTrack): void {
    const stream = new AudioStream(track, SAMPLE_RATE, NUM_CHANNELS)
    ;(async () => {
      for await (const frame of stream) {
        if (this.stopped) break
        // Catch per-frame errors so one bad frame never kills the whole stream loop
        try {
          await this.routeFrame(speakingAgentId, frame)
        } catch (err) {
          if (!this.stopped) {
            const msg = err instanceof Error ? err.message : String(err)
            log.warn(`routeFrame error for ${speakingAgentId}: ${msg}`)
          }
        }
      }
      log.info(`Audio stream ended for agent ${speakingAgentId}`)
    })().catch((err) => {
      if (!this.stopped) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Object ? err as object : {})) || String(err)
        log.error(`Capture stream error for ${speakingAgentId}`, new Error(msg))
      }
    })
  }

  /**
   * Safely push one audio frame to a destination source.
   * Catches InvalidState and other RTC errors so a bad destination never
   * interrupts routing to other agents or crashes the captureAndRoute loop.
   */
  private async safeCaptureFrame(
    src: AudioSource,
    frame: AudioFrame,
    label: string,
  ): Promise<void> {
    try {
      await src.captureFrame(
        new AudioFrame(new Int16Array(frame.data), frame.sampleRate, frame.channels, frame.samplesPerChannel),
      )
    } catch (err) {
      if (!this.stopped) {
        const msg = err instanceof Error ? err.message : String(err)
        log.warn(`captureFrame failed [${label}]: ${msg}`)
      }
    }
  }

  /**
   * Transition the debate to a new phase.
   * - opening: moderator leads (mod → all; debaters → mod only)
   * - debate/closing: full 3-way call (everyone → everyone)
   */
  setPhase(phase: DebatePhase): void {
    this.phase = phase
    log.info(`Phase → ${phase}`)
  }

  private async routeFrame(speakingAgentId: string, frame: AudioFrame): Promise<void> {
    // Always forward to public broadcast room (audience hears everyone)
    const publicSrc = this.publicSources.get(speakingAgentId)
    if (publicSrc) {
      await this.safeCaptureFrame(publicSrc, frame, `public:${speakingAgentId}`)
    }

    // ── Opening phase: moderator-led intro ───────────────────────────────────
    // Mod audio → all agents so debaters hear the intro.
    // Debater audio → mod only so debaters don't hear each other yet and the
    // moderator can address each one directly.
    if (this.phase === 'opening') {
      const agentRole = this.calls.get(speakingAgentId)?.meta.role
      if (agentRole === 'moderator') {
        for (const [agentId, conn] of this.calls) {
          if (agentId === speakingAgentId) continue
          await this.safeCaptureFrame(conn.injectSource, frame, `opening:mod→${agentId}`)
        }
      } else {
        for (const [agentId, conn] of this.calls) {
          if (agentId === speakingAgentId) continue
          if (this.calls.get(agentId)?.meta.role !== 'moderator') continue
          await this.safeCaptureFrame(conn.injectSource, frame, `opening:deb→mod`)
        }
      }
      return
    }

    // ── Debate / closing phase: true 3-way call ───────────────────────────────
    // Every agent's audio routes to every other agent unconditionally.
    // Natural conversational flow — no turn enforcement, no floor control.
    for (const [agentId, conn] of this.calls) {
      if (agentId === speakingAgentId) continue
      await this.safeCaptureFrame(conn.injectSource, frame, `3way:${speakingAgentId}→${agentId}`)
    }
  }

  /**
   * Inject synthesized PCM audio into a specific agent's call room as user audio.
   * Used for audience questions routed to the moderator.
   * The injected audio is NOT forwarded to other agents or the public room.
   */
  async injectAudio(agentId: string, pcmBuffer: Buffer): Promise<void> {
    const conn = this.calls.get(agentId)
    if (!conn) return

    const int16 = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2)
    for (let offset = 0; offset < int16.length; offset += FRAME_SAMPLES) {
      const end = Math.min(offset + FRAME_SAMPLES, int16.length)
      const chunk = new Int16Array(end - offset)
      chunk.set(int16.subarray(offset, end))
      const syntheticFrame = new AudioFrame(chunk, SAMPLE_RATE, NUM_CHANNELS, chunk.length)
      await this.safeCaptureFrame(conn.injectSource, syntheticFrame, `inject:${agentId}`)
    }
  }

  async disconnect(): Promise<void> {
    this.stopped = true
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null }
    for (const conn of this.calls.values()) {
      await conn.room.disconnect().catch(() => {})
    }
    this.calls.clear()
    for (const room of this.publicRooms.values()) {
      await room.disconnect().catch(() => {})
    }
    this.publicRooms.clear()
    log.info('AudioRelay disconnected')
  }

  get isActive(): boolean {
    return !this.stopped && this.calls.size > 0
  }
}
