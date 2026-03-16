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
}

interface ConnectedCall {
  meta: RelayAgent
  room: Room
  injectSource: AudioSource  // frames pushed here become "user" audio in this call
}

/**
 * AudioRelay bridges multiple Retell call rooms to enable agent-to-agent debate.
 *
 * For each Retell web call, the relay:
 *   1. Connects as the "client" participant using Retell's access_token
 *   2. Publishes an AudioSource track (Retell agent hears this as "user" speech)
 *   3. Subscribes to the Retell agent's audio output track
 *
 * When Agent A's audio track fires frames, the relay injects those frames into
 * every other agent's call as "user" audio. This triggers each Retell agent's
 * VAD → STT → LLM pipeline, creating natural multi-agent conversation.
 *
 * Optionally republishes all agent audio to a public LiveKit room for audience.
 */
export class AudioRelay {
  private calls = new Map<string, ConnectedCall>()
  private publicRooms = new Map<string, Room>()      // agentId → Room (one per agent)
  private publicSources = new Map<string, AudioSource>()
  private stopped = false

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

      log.info(`Connected ${agent.agentName} to public broadcast room`)
    }
  }

  private captureAndRoute(speakingAgentId: string, track: RemoteAudioTrack): void {
    const stream = new AudioStream(track, SAMPLE_RATE, NUM_CHANNELS)
    ;(async () => {
      for await (const frame of stream) {
        if (this.stopped) break
        await this.routeFrame(speakingAgentId, frame)
      }
      log.info(`Audio stream ended for agent ${speakingAgentId}`)
    })().catch((err) => {
      if (!this.stopped) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err, Object.getOwnPropertyNames(err instanceof Object ? err as object : {})) || String(err)
        log.error(`Capture error for ${speakingAgentId}`, new Error(msg))
      }
    })
  }

  private async routeFrame(speakingAgentId: string, frame: AudioFrame): Promise<void> {
    // Cross-route into every other agent's call as user input.
    // Each destination gets its own AudioFrame copy — the native layer may
    // release the underlying buffer after captureFrame, so we must not reuse
    // the same frame object across multiple calls.
    for (const [agentId, conn] of this.calls) {
      if (agentId === speakingAgentId) continue
      const copy = new AudioFrame(
        new Int16Array(frame.data),
        frame.sampleRate,
        frame.channels,
        frame.samplesPerChannel,
      )
      await conn.injectSource.captureFrame(copy)
    }

    // Forward to public broadcast room under speaker's track
    const publicSrc = this.publicSources.get(speakingAgentId)
    if (publicSrc) {
      const pubCopy = new AudioFrame(
        new Int16Array(frame.data),
        frame.sampleRate,
        frame.channels,
        frame.samplesPerChannel,
      )
      await publicSrc.captureFrame(pubCopy)
    }
  }

  /**
   * Inject synthesized PCM audio into a specific agent's call room as user audio.
   * Used to send control signals to the moderator (e.g., phase transitions).
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
      await conn.injectSource.captureFrame(new AudioFrame(chunk, SAMPLE_RATE, NUM_CHANNELS, chunk.length))
    }
  }

  async disconnect(): Promise<void> {
    this.stopped = true
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
