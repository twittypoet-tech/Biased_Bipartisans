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
import { RETELL_LIVEKIT_URL } from './audio-relay.js'
import { LiveKitRoomManager } from '../livekit/room-manager.js'

const log = createLogger('agents:retell:reporter-relay')

const SAMPLE_RATE = 24000
const NUM_CHANNELS = 1
const FRAME_SAMPLES = 480 // 20ms at 24kHz
const MAX_QUEUE = 5

export interface ReporterRelayConfig {
  wireAccessToken: string
  reporterAccessToken: string
}

export interface ReporterRelayResult {
  publicRoomUrl: string
  browserToken: string
}

/**
 * Bridges The Wire Host and The Reporter into a shared audio session,
 * following the same architecture as debate AudioRelay:
 *
 * - Each agent has its own Retell web call (separate LiveKit rooms on Retell cloud)
 * - This relay connects to BOTH Retell rooms and routes audio bidirectionally
 * - A public LiveKit room is created for the browser to subscribe to
 * - All agent audio is published to the public room so the user hears both
 *
 * No turn management — both agents can speak freely. Wire says its greeting,
 * Reporter hears it (preventing Error_no_audio_received), then Wire disconnects.
 */
export class ReporterRelay {
  private retellCalls = new Map<string, { room: Room; injectSource: AudioSource }>()
  private publicRooms = new Map<string, Room>()
  private publicSources = new Map<string, AudioSource>()
  private stopped = false
  private safetyTimeout: ReturnType<typeof setTimeout> | null = null

  // Frame queue for non-blocking audio routing (same pattern as AudioRelay)
  private frameQueues = new Map<string, AudioFrame[]>()
  private queueDraining = new Set<string>()

  /**
   * Prepare the public LiveKit room and generate a browser token.
   * Call this BEFORE start() so the token can be returned to the API caller.
   */
  async prepare(): Promise<ReporterRelayResult> {
    if (!LiveKitRoomManager.isConfigured()) {
      throw new Error('LiveKit not configured (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)')
    }

    const roomManager = new LiveKitRoomManager()
    const roomName = `reporter-${Date.now()}`

    await roomManager.createRoom(roomName)

    const browserToken = await roomManager.generateToken(
      roomName,
      'listener',
      `listener-${Date.now()}`,
      'subscriber',
    )

    // Store for use in start()
    this._roomManager = roomManager
    this._roomName = roomName

    return {
      publicRoomUrl: process.env.LIVEKIT_URL!,
      browserToken,
    }
  }

  private _roomManager: LiveKitRoomManager | null = null
  private _roomName: string | null = null

  /**
   * Connect to both Retell rooms and the public room. Runs indefinitely
   * until Wire disconnects or safety timeout (3 min).
   */
  async start(config: ReporterRelayConfig): Promise<void> {
    const { wireAccessToken, reporterAccessToken } = config
    const roomManager = this._roomManager
    const roomName = this._roomName

    if (!roomManager || !roomName) {
      throw new Error('Must call prepare() before start()')
    }

    // Generate publisher tokens for the relay to publish into the public room
    const wirePublicToken = await roomManager.generateToken(
      roomName, 'The Wire', 'wire-relay', 'publisher',
    )
    const reporterPublicToken = await roomManager.generateToken(
      roomName, 'The Reporter', 'reporter-relay', 'publisher',
    )

    // Connect to both Retell rooms
    await Promise.all([
      this.connectRetellCall('wire', wireAccessToken),
      this.connectRetellCall('reporter', reporterAccessToken),
    ])

    // Connect to public room (one connection per agent, each publishes a track)
    await Promise.all([
      this.connectPublicRoom('wire', process.env.LIVEKIT_URL!, wirePublicToken),
      this.connectPublicRoom('reporter', process.env.LIVEKIT_URL!, reporterPublicToken),
    ])

    log.info('ReporterRelay fully connected — Wire and Reporter can hear each other')

    // Safety timeout: 10 minutes max (matches browser-side timeout).
    // The Reporter's Retell agent has an end_call tool that fires after
    // delivering the report, which ends the call naturally before this.
    this.safetyTimeout = setTimeout(() => {
      log.warn('Reporter relay safety timeout — stopping')
      this.stop()
    }, 10 * 60 * 1000)
  }

  private async connectRetellCall(agentKey: string, token: string): Promise<void> {
    const room = new Room()
    const injectSource = new AudioSource(SAMPLE_RATE, NUM_CHANNELS)

    // Register listeners BEFORE connect (Retell agents with "AI speaks first"
    // publish audio almost immediately — same lesson from AudioRelay)
    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== TrackKind.KIND_AUDIO) return
      log.info(`Retell audio subscribed: ${participant.identity} (${agentKey})`)
      this.captureAndRoute(agentKey, track as RemoteAudioTrack)
    })

    room.on(RoomEvent.Disconnected, () => {
      log.info(`Retell call disconnected: ${agentKey}`)
      this.retellCalls.delete(agentKey)
      if (this.retellCalls.size === 0) {
        log.info('All Retell calls disconnected — stopping relay')
        this.stop()
      }
    })

    await room.connect(RETELL_LIVEKIT_URL, token, {
      autoSubscribe: true,
      dynacast: false,
    })

    // Publish inject source — frames pushed here become "user" audio in this call
    const track = LocalAudioTrack.createAudioTrack('user-audio', injectSource)
    await room.localParticipant!.publishTrack(track, new TrackPublishOptions())
    await this.warmupSource(injectSource, `retell:${agentKey}`)

    this.retellCalls.set(agentKey, { room, injectSource })
    log.info(`Connected to Retell room: ${agentKey}`)
  }

  private async connectPublicRoom(agentKey: string, url: string, token: string): Promise<void> {
    const room = new Room()
    const src = new AudioSource(SAMPLE_RATE, NUM_CHANNELS)

    await room.connect(url, token, { autoSubscribe: false, dynacast: false })

    const track = LocalAudioTrack.createAudioTrack('voice', src)
    await room.localParticipant!.publishTrack(track, new TrackPublishOptions())
    await this.warmupSource(src, `public:${agentKey}`)

    this.publicRooms.set(agentKey, room)
    this.publicSources.set(agentKey, src)

    room.on(RoomEvent.Disconnected, () => {
      this.publicRooms.delete(agentKey)
      this.publicSources.delete(agentKey)
    })

    log.info(`Connected ${agentKey} to public broadcast room`)
  }

  private captureAndRoute(speakingAgentKey: string, track: RemoteAudioTrack): void {
    const stream = new AudioStream(track, SAMPLE_RATE, NUM_CHANNELS)
    ;(async () => {
      for await (const frame of stream) {
        if (this.stopped) break
        this.routeFrame(speakingAgentKey, frame)
      }
      log.info(`Audio stream ended for ${speakingAgentKey}`)
    })().catch((err) => {
      if (!this.stopped) {
        log.warn(`Capture stream error for ${speakingAgentKey}: ${err}`)
      }
    })
  }

  /**
   * Route audio from one agent to all other Retell calls + public room.
   * No turn gating — both agents can speak simultaneously.
   */
  private routeFrame(speakingAgentKey: string, frame: AudioFrame): void {
    // Inject into all OTHER Retell calls (bidirectional)
    for (const [key, conn] of this.retellCalls) {
      if (key === speakingAgentKey) continue
      this.safeCaptureFrame(`${speakingAgentKey}→${key}`, conn.injectSource, frame)
    }

    // Publish to public room so browser hears it
    const publicSrc = this.publicSources.get(speakingAgentKey)
    if (publicSrc) {
      this.safeCaptureFrame(`public:${speakingAgentKey}`, publicSrc, frame)
    }
  }

  // ── Frame queue (same pattern as AudioRelay.safeCaptureFrame) ───────────

  private safeCaptureFrame(label: string, src: AudioSource, frame: AudioFrame): void {
    const copy = new AudioFrame(
      new Int16Array(frame.data),
      frame.sampleRate,
      frame.channels,
      frame.samplesPerChannel,
    )

    let queue = this.frameQueues.get(label)
    if (!queue) {
      queue = []
      this.frameQueues.set(label, queue)
    }

    if (queue.length >= MAX_QUEUE) queue.shift()
    queue.push(copy)

    if (!this.queueDraining.has(label)) {
      void this.drainQueue(label, src)
    }
  }

  private async drainQueue(label: string, src: AudioSource): Promise<void> {
    this.queueDraining.add(label)
    try {
      const queue = this.frameQueues.get(label)
      if (!queue) return
      while (queue.length > 0 && !this.stopped) {
        const frame = queue.shift()!
        try {
          await src.captureFrame(frame)
        } catch {
          // swallow — destination may have disconnected
        }
      }
    } finally {
      this.queueDraining.delete(label)
    }
  }

  private async warmupSource(src: AudioSource, label: string): Promise<void> {
    const silent = new Int16Array(FRAME_SAMPLES)
    const warmupFrame = new AudioFrame(silent, SAMPLE_RATE, NUM_CHANNELS, FRAME_SAMPLES)
    const deadline = Date.now() + 2000
    let attempts = 0

    while (Date.now() < deadline) {
      try {
        await src.captureFrame(warmupFrame)
        log.info(`AudioSource ready: ${label} (${attempts} retries)`)
        return
      } catch {
        attempts++
        await new Promise(r => setTimeout(r, 20))
      }
    }
    log.warn(`AudioSource warmup timeout: ${label} (${attempts} attempts)`)
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  async stop(): Promise<void> {
    if (this.stopped) return
    this.stopped = true
    if (this.safetyTimeout) clearTimeout(this.safetyTimeout)

    for (const conn of this.retellCalls.values()) {
      await conn.room.disconnect().catch(() => {})
    }
    this.retellCalls.clear()

    for (const room of this.publicRooms.values()) {
      await room.disconnect().catch(() => {})
    }
    this.publicRooms.clear()
    this.publicSources.clear()
    this.frameQueues.clear()

    // Clean up the public room
    if (this._roomManager && this._roomName) {
      await this._roomManager.deleteRoom(this._roomName).catch(() => {})
    }

    log.info('ReporterRelay stopped')
  }
}
