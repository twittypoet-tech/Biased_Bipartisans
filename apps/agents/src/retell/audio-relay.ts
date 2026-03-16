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
 */
export const RETELL_LIVEKIT_URL = 'wss://retell-ai-4ihahnq7.livekit.cloud'

const SAMPLE_RATE = 24000
const NUM_CHANNELS = 1
const FRAME_SAMPLES = 480 // 20ms at 24kHz

/** RMS energy above this level counts as active speech (for 16-bit PCM, ~-26 dBFS) */
const SPEECH_RMS_THRESHOLD = 1000
/** ms of continuous silence before the speaker releases the floor */
const FLOOR_RELEASE_MS = 1000
/**
 * After the moderator finishes speaking, block the previous debater from
 * reclaiming the floor for this many ms. Gives the newly-addressed debater
 * time to generate their response before the other agent fills the silence.
 */
const POST_MOD_GRACE_MS = 4_000

export interface RelayAgent {
  agentId: string      // Supabase agent UUID
  callId: string       // Retell call ID
  accessToken: string  // Retell access_token (LiveKit JWT for Retell cloud)
  agentName: string
  role: 'debater' | 'moderator'
}

/**
 * Debate phase marker — used to reset VAD state at phase boundaries.
 * Routing is identical across all phases (VAD floor control throughout).
 */
export type DebatePhase = 'opening' | 'debate' | 'closing'

interface ConnectedCall {
  meta: RelayAgent
  room: Room
  injectSource: AudioSource  // frames pushed here become "user" audio in this call
}

interface SpeakerState {
  isSpeaking: boolean
  silentSince: number  // epoch ms when silence started (Infinity = currently speaking)
}

/**
 * AudioRelay bridges multiple Retell call rooms into a multi-agent debate.
 *
 * VAD floor control is active for the entire debate (opening through closing):
 * the first agent to produce speech energy claims the floor and cross-routes
 * their audio to all other agents until 1s of continuous silence. The moderator
 * can preempt any debater. This prevents simultaneous speech while allowing all
 * agents to hear and respond to each other naturally.
 *
 * Post-moderator grace period: after the mod releases the floor, the previous
 * debater is blocked from immediately reclaiming it, giving the newly-addressed
 * debater time to generate their LLM response first.
 *
 * Each AudioSource is warmed up after publish and kept alive via a 200ms
 * heartbeat to prevent InvalidState errors and Retell end-of-turn timeouts.
 */
export class AudioRelay {
  private calls = new Map<string, ConnectedCall>()
  private publicRooms = new Map<string, Room>()
  private publicSources = new Map<string, AudioSource>()
  private stopped = false
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  private phase: DebatePhase = 'opening'

  // VAD floor control for debate/closing phases
  private floorHolder: string | null = null
  private speakerStates = new Map<string, SpeakerState>()

  // Post-moderator grace period: after the mod finishes, block the previous
  // debater from reclaiming the floor so the other debater has time to respond.
  private lastDebaterFloorHolder: string | null = null
  private postModGraceUntil = 0  // epoch ms

  // Rate-limit warn logging: one log per label per 5s to prevent frame-level spam
  private lastWarnTime = new Map<string, number>()

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

    await room.connect(RETELL_LIVEKIT_URL, meta.accessToken, {
      autoSubscribe: true,
      dynacast: false,
    })

    // Register event listeners IMMEDIATELY after connect — before publishTrack
    // and before warmupSource. Retell agents with "AI speaks first" publish their
    // audio track almost instantly. publishTrack and warmupSource both yield the
    // event loop via await; if TrackSubscribed fires during those awaits and no
    // listener is registered yet, the event is lost and captureAndRoute never
    // starts, which means no audio reaches the public room or other agents.
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== TrackKind.KIND_AUDIO) return
      log.info(`Subscribed to agent audio: ${participant.identity} → ${meta.agentName}`)
      this.captureAndRoute(meta.agentId, track as RemoteAudioTrack)
    })

    room.on(RoomEvent.Disconnected, () => {
      log.info(`Retell call disconnected: ${meta.agentName} (${meta.callId})`)
      this.calls.delete(meta.agentId)
    })

    const track = LocalAudioTrack.createAudioTrack('user-audio', injectSource)
    await room.localParticipant!.publishTrack(track, new TrackPublishOptions())

    // Warm up the AudioSource — spin until the first captureFrame succeeds (up to 2s).
    // The native WebRTC PCM pipeline is not immediately ready after publishTrack resolves.
    await this.warmupSource(injectSource, meta.agentName)

    const conn: ConnectedCall = { meta, room, injectSource }
    this.calls.set(meta.agentId, conn)

    log.info(`Connected to Retell call: ${meta.agentName} (${meta.callId})`)
  }

  private async connectPublicRoom(
    baseUrl: string,
    tokens: Map<string, string>,
    agents: RelayAgent[],
  ): Promise<void> {
    for (const agent of agents) {
      const token = tokens.get(agent.agentId)
      if (!token) continue

      const room = new Room()
      await room.connect(baseUrl, token, { autoSubscribe: false, dynacast: false })

      const src = new AudioSource(SAMPLE_RATE, NUM_CHANNELS)
      const track = LocalAudioTrack.createAudioTrack('voice', src)
      await room.localParticipant!.publishTrack(track, new TrackPublishOptions())

      await this.warmupSource(src, `public:${agent.agentName}`)

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
   * Spin-loop until the AudioSource accepts a silent frame, or timeout after 2s.
   * This eliminates the InvalidState window between publishTrack and when the
   * native PCM pipeline becomes ready.
   */
  private async warmupSource(src: AudioSource, label: string): Promise<void> {
    const silent = new Int16Array(FRAME_SAMPLES)
    const warmupFrame = new AudioFrame(silent, SAMPLE_RATE, NUM_CHANNELS, FRAME_SAMPLES)
    const deadline = Date.now() + 2000
    let attempts = 0

    while (Date.now() < deadline) {
      try {
        await src.captureFrame(warmupFrame)
        log.info(`AudioSource ready for ${label} (${attempts} retries)`)
        return
      } catch {
        attempts++
        await new Promise(r => setTimeout(r, 20))
      }
    }
    log.warn(`AudioSource warmup timeout for ${label} after ${attempts} attempts`)
  }

  /**
   * Send silent keepalive frames to every injectSource every 200ms.
   * Each tick pushes 10 frames (10 × 20ms = 200ms of silence) so Retell sees a
   * continuous audio stream rather than isolated pulses. Without this, prolonged
   * silence between turns causes Retell's end-of-turn detection to fire and
   * triggers agents to generate filler speech ("I'll wait for my opponent").
   */
  private startHeartbeat(): void {
    const silent = new Int16Array(FRAME_SAMPLES)
    const silentFrame = new AudioFrame(silent, SAMPLE_RATE, NUM_CHANNELS, FRAME_SAMPLES)
    const FRAMES_PER_TICK = 10  // 10 × 20ms = 200ms
    this.heartbeatTimer = setInterval(async () => {
      if (this.stopped) return
      for (const [agentId, conn] of this.calls) {
        for (let i = 0; i < FRAMES_PER_TICK; i++) {
          try {
            await conn.injectSource.captureFrame(silentFrame)
          } catch {
            log.warn(`Heartbeat failed for ${agentId}`)
            break
          }
        }
      }
    }, 200)
    this.heartbeatTimer.unref?.()
  }

  private captureAndRoute(speakingAgentId: string, track: RemoteAudioTrack): void {
    const stream = new AudioStream(track, SAMPLE_RATE, NUM_CHANNELS)
    ;(async () => {
      for await (const frame of stream) {
        if (this.stopped) break
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
        const msg = err instanceof Error ? err.message : String(err)
        log.error(`Capture stream error for ${speakingAgentId}`, new Error(msg))
      }
    })
  }

  /**
   * Safely push one frame to a destination AudioSource.
   * Errors are caught per-destination so one bad source never disrupts others.
   * Warnings are rate-limited to one per 5s per label to prevent log floods.
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
        const now = Date.now()
        const last = this.lastWarnTime.get(label) ?? 0
        if (now - last > 5000) {
          const msg = err instanceof Error ? err.message : String(err)
          log.warn(`captureFrame failed [${label}]: ${msg}`)
          this.lastWarnTime.set(label, now)
        }
      }
    }
  }

  private computeRMS(frame: AudioFrame): number {
    let sum = 0
    for (const s of frame.data) sum += s * s
    return Math.sqrt(sum / (frame.data.length || 1))
  }

  /**
   * Transition the debate to a new phase.
   * Resets VAD floor state so the new phase starts clean.
   */
  setPhase(phase: DebatePhase): void {
    this.phase = phase
    this.floorHolder = null
    this.lastDebaterFloorHolder = null
    this.postModGraceUntil = 0
    for (const s of this.speakerStates.values()) {
      s.isSpeaking = false
      s.silentSince = Infinity
    }
    log.info(`Phase → ${phase}`)
  }

  private async routeFrame(speakingAgentId: string, frame: AudioFrame): Promise<void> {
    const routes: Promise<void>[] = []

    // ── VAD floor control (all phases) ───────────────────────────────────────
    // First agent to produce speech energy claims the floor and cross-routes to
    // all others until 1s of silence. Moderator preempts any debater.
    //
    // Post-moderator grace period: after the mod releases the floor, the debater
    // who PREVIOUSLY held it is blocked from reclaiming for POST_MOD_GRACE_MS,
    // giving the newly-addressed debater time to generate their LLM response.
    //
    // Public room routing follows the same VAD rules for a consistent audience
    // experience — only the floor holder's audio reaches the broadcast room.
    const rms = this.computeRMS(frame)
    const now = Date.now()
    const ismod = this.calls.get(speakingAgentId)?.meta.role === 'moderator'

    let state = this.speakerStates.get(speakingAgentId)
    if (!state) {
      state = { isSpeaking: false, silentSince: Infinity }
      this.speakerStates.set(speakingAgentId, state)
    }

    if (rms > SPEECH_RMS_THRESHOLD) {
      state.silentSince = Infinity
      state.isSpeaking = true

      if (ismod) {
        // Moderator always preempts — cancel any active grace period while speaking
        if (this.floorHolder !== speakingAgentId) {
          this.floorHolder = speakingAgentId
          this.postModGraceUntil = 0
          const name = this.calls.get(speakingAgentId)?.meta.agentName ?? speakingAgentId
          log.info(`Floor → ${name}`)
        }
      } else if (this.floorHolder === null) {
        // Debater: only claim if floor is free AND not blocked by post-mod grace
        const isBlocked = now < this.postModGraceUntil &&
          speakingAgentId === this.lastDebaterFloorHolder
        if (!isBlocked) {
          this.floorHolder = speakingAgentId
          this.lastDebaterFloorHolder = speakingAgentId
          const name = this.calls.get(speakingAgentId)?.meta.agentName ?? speakingAgentId
          log.info(`Floor → ${name}`)
        }
        // else: still in grace period, this agent is blocked — frames not routed
      }
    } else if (state.isSpeaking) {
      if (state.silentSince === Infinity) state.silentSince = now
      if (now - state.silentSince > FLOOR_RELEASE_MS) {
        state.isSpeaking = false
        if (this.floorHolder === speakingAgentId) {
          this.floorHolder = null
          const name = this.calls.get(speakingAgentId)?.meta.agentName ?? speakingAgentId
          log.info(`Floor released by ${name}`)
          if (ismod) {
            // Mod finished — block the previous debater from immediately reclaiming
            this.postModGraceUntil = now + POST_MOD_GRACE_MS
            const blockedName =
              this.calls.get(this.lastDebaterFloorHolder ?? '')?.meta.agentName ?? 'none'
            log.info(`Post-mod grace: ${blockedName} blocked for ${POST_MOD_GRACE_MS}ms`)
          }
        }
      }
    }

    // Route if this agent holds the floor — applies to both agent cross-routing
    // and the public broadcast room for a consistent audio experience.
    if (this.floorHolder === speakingAgentId) {
      const publicSrc = this.publicSources.get(speakingAgentId)
      if (publicSrc) {
        routes.push(this.safeCaptureFrame(publicSrc, frame, `public:${speakingAgentId}`))
      }
      for (const [agentId, conn] of this.calls) {
        if (agentId === speakingAgentId) continue
        routes.push(this.safeCaptureFrame(conn.injectSource, frame, `vad:${speakingAgentId}→${agentId}`))
      }
    }

    await Promise.all(routes)
  }

  /**
   * Inject synthesized PCM audio into a specific agent's call as user audio.
   * Used for audience questions routed to the moderator.
   * NOT forwarded to other agents or the public room.
   */
  async injectAudio(agentId: string, pcmBuffer: Buffer): Promise<void> {
    const conn = this.calls.get(agentId)
    if (!conn) return

    const int16 = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2)
    for (let offset = 0; offset < int16.length; offset += FRAME_SAMPLES) {
      const end = Math.min(offset + FRAME_SAMPLES, int16.length)
      const chunk = new Int16Array(end - offset)
      chunk.set(int16.subarray(offset, end))
      await this.safeCaptureFrame(
        conn.injectSource,
        new AudioFrame(chunk, SAMPLE_RATE, NUM_CHANNELS, chunk.length),
        `inject:${agentId}`,
      )
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
