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

/** RMS energy above this level counts as active speech (16-bit PCM, ~-26 dBFS) */
const SPEECH_RMS_THRESHOLD = 1000

/**
 * Current speaker must be silent for at least this long before we begin
 * watching for the next speaker. Prevents mid-sentence pauses from ending a turn.
 *
 * 1000ms: Retell VAD fires ~500ms after silence starts, so the next speaker's
 * LLM has ~500ms of generation time before we advance. With the expected-next-
 * speaker guard in place (only the playbook's next agent can trigger early
 * advance), false advances from non-turn speakers are no longer a concern,
 * so we can safely use a shorter window to minimise cut audio at turn starts.
 */
const MIN_SILENCE_BEFORE_HANDOFF_MS = 1000

/**
 * If the expected next speaker hasn't triggered early advance within this many
 * ms of current-speaker silence, advance the turn anyway (safety fallback).
 *
 * 7s: total max gap = 1s (MIN_SILENCE) + 7s (timeout) = 8s. Covers Retell LLM
 * cold-start response time (VAD ~500ms + LLM generation ~1-3s + TTS startup).
 */
const TURN_TIMEOUT_MS = 7_000

/**
 * A turn must be active for at least this long before the silence timeout can
 * arm. Prevents ghost timers from a prior turn (race between routeFrame arming
 * a timer and advanceTurn clearing it) from firing in under a second.
 */
const MIN_TURN_DURATION_MS = 3_000

/**
 * How many frames to keep in the rolling speaker buffer for deferred injection.
 * 250 frames × 20ms = 5 seconds of recent speech.
 *
 * This is injected into the next speaker's Retell call at turn start, giving
 * their LLM immediate context without continuous injection during active speech
 * (which caused barge-in oscillation and audio fragmentation).
 */
const MAX_BUFFER_FRAMES = 250

export interface RelayAgent {
  agentId: string      // Supabase agent UUID
  callId: string       // Retell call ID
  accessToken: string  // Retell access_token (LiveKit JWT for Retell cloud)
  agentName: string
  role: 'debater' | 'moderator'
}

interface ConnectedCall {
  meta: RelayAgent
  room: Room
  injectSource: AudioSource  // frames pushed here become "user" audio in this call
}

/**
 * AudioRelay bridges multiple Retell call rooms into a structured turn-based debate.
 *
 * Turn control: only the current turn speaker's audio is routed to other agents
 * and the public room. Other agents receive the current speaker's audio in
 * real-time (their LLMs build context and queue responses), but their own
 * outgoing audio is not forwarded until it is their turn.
 *
 * Turn handoff: when the current speaker goes silent for MIN_SILENCE_BEFORE_HANDOFF_MS,
 * the relay watches for any other agent to start producing audio. The moment
 * that happens, the turn ends — catching the next speaker at word one. A
 * TURN_TIMEOUT_MS fallback advances the turn if nobody speaks.
 *
 * The conductor calls setTurn() to begin each turn and receives an onTurnEnd
 * callback when the turn completes, allowing it to drive the playbook sequence.
 */
export class AudioRelay {
  private calls = new Map<string, ConnectedCall>()
  private publicRooms = new Map<string, Room>()
  private publicSources = new Map<string, AudioSource>()
  private stopped = false

  // Turn state — driven by the conductor via setTurn()
  private currentTurnAgentId: string | null = null
  private nextTurnAgentId: string | null = null
  private onTurnEnd: (() => void) | null = null
  private currentSpeakerSilentSince: number | null = null  // epoch ms
  private turnTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private turnAdvanced = false  // guard: only advance once per turn
  private turnStartTime: number | null = null  // epoch ms when current turn began

  // Per-destination FIFO frame queue — up to 5 frames (100ms) buffered per destination
  private frameQueues = new Map<string, AudioFrame[]>()

  // Per-destination drain loop guard — true while drainQueue() is running for that label
  private queueDraining = new Set<string>()

  // Rate-limit warn logging: one log per label per 5s
  private lastWarnTime = new Map<string, number>()

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

    await room.connect(RETELL_LIVEKIT_URL, meta.accessToken, {
      autoSubscribe: true,
      dynacast: false,
    })

    // Listeners FIRST — before publishTrack/warmupSource to never miss TrackSubscribed.
    // Retell agents with "AI speaks first" publish their audio track almost immediately.
    // publishTrack and warmupSource both yield the event loop; if TrackSubscribed fires
    // during those awaits with no listener registered, the event is permanently lost.
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
   * Eliminates the InvalidState window between publishTrack and native PCM ready.
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
   * Set the current turn speaker. Only this agent's audio will be routed to
   * all other agents and the public room. All other agents hear the current
   * speaker in real-time, allowing their LLMs to build context and queue
   * responses for when their own turn arrives.
   *
   * onTurnEnd is called when: (a) current speaker silent ≥ MIN_SILENCE_BEFORE_HANDOFF_MS
   * and another agent starts speaking, or (b) TURN_TIMEOUT_MS elapses after silence.
   */
  setTurn(agentId: string, nextAgentId: string | null, onTurnEnd: () => void): void {
    this.clearTurnTimeout()
    this.currentTurnAgentId = agentId
    this.nextTurnAgentId = nextAgentId
    this.currentSpeakerSilentSince = null
    this.onTurnEnd = onTurnEnd
    this.turnAdvanced = false
    this.turnStartTime = Date.now()
    const name = this.calls.get(agentId)?.meta.agentName ?? agentId
    const nextName = nextAgentId ? (this.calls.get(nextAgentId)?.meta.agentName ?? nextAgentId) : 'none'
    log.info(`Turn → ${name} (next: ${nextName})`)
  }

  private clearTurnTimeout(): void {
    if (this.turnTimeoutTimer) {
      clearTimeout(this.turnTimeoutTimer)
      this.turnTimeoutTimer = null
    }
  }

  private advanceTurn(reason: string): void {
    if (this.turnAdvanced || !this.onTurnEnd) return
    this.turnAdvanced = true
    this.clearTurnTimeout()

    const name = this.calls.get(this.currentTurnAgentId ?? '')?.meta.agentName ?? 'unknown'
    log.info(`Turn ended [${name}]: ${reason}`)

    this.currentTurnAgentId = null
    this.currentSpeakerSilentSince = null

    const cb = this.onTurnEnd
    this.onTurnEnd = null
    cb()
  }

  private captureAndRoute(speakingAgentId: string, track: RemoteAudioTrack): void {
    const stream = new AudioStream(track, SAMPLE_RATE, NUM_CHANNELS)
    ;(async () => {
      for await (const frame of stream) {
        if (this.stopped) break
        try {
          this.routeFrame(speakingAgentId, frame)
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

  private routeFrame(speakingAgentId: string, frame: AudioFrame): void {
    const isTurnSpeaker = speakingAgentId === this.currentTurnAgentId
    const rms = this.computeRMS(frame)
    const now = Date.now()

    if (isTurnSpeaker) {
      // Always route every frame — silence gaps must reach the public room so
      // the audio stream is continuous. Gating on RMS created 20-200ms holes
      // in TTS audio (inter-word pauses, soft consonants) that sounded choppy
      // to live viewers.
      this.broadcast(speakingAgentId, frame)

      if (rms > SPEECH_RMS_THRESHOLD) {
        // Active speech — reset silence window
        this.currentSpeakerSilentSince = null
        this.clearTurnTimeout()
      } else {
        // Silence — track for turn handoff only
        if (this.currentSpeakerSilentSince === null) {
          this.currentSpeakerSilentSince = now
        }
        const silentMs = now - this.currentSpeakerSilentSince

        // After MIN_SILENCE_BEFORE_HANDOFF_MS, arm the fallback timeout once —
        // but only if the turn has been active for at least MIN_TURN_DURATION_MS.
        // The floor prevents ghost timers from prior turns (which survive clearTurnTimeout
        // in a race) from firing in < 1s and ending a brand-new turn immediately.
        const turnActiveMs = this.turnStartTime !== null ? now - this.turnStartTime : 0
        if (
          silentMs >= MIN_SILENCE_BEFORE_HANDOFF_MS &&
          turnActiveMs >= MIN_TURN_DURATION_MS &&
          !this.turnTimeoutTimer &&
          this.onTurnEnd
        ) {
          this.turnTimeoutTimer = setTimeout(() => {
            this.advanceTurn('timeout — no next speaker detected')
          }, TURN_TIMEOUT_MS)
          this.turnTimeoutTimer.unref?.()
        }
      }
    } else {
      // Not the current turn speaker — their audio is not routed.
      // BUT: once the current speaker has been silent long enough, the moment
      // this agent starts producing speech we advance the turn immediately,
      // catching them at the very first frame of their response.
      if (
        !this.turnAdvanced &&
        this.onTurnEnd &&
        this.currentSpeakerSilentSince !== null &&
        now - this.currentSpeakerSilentSince >= MIN_SILENCE_BEFORE_HANDOFF_MS &&
        rms > SPEECH_RMS_THRESHOLD &&
        speakingAgentId === this.nextTurnAgentId
      ) {
        const name = this.calls.get(speakingAgentId)?.meta.agentName ?? speakingAgentId
        log.info(`Next speaker detected: ${name} — advancing turn`)
        this.advanceTurn('next speaker started')
        // The conductor will call setTurn() for the next turn agent (possibly this
        // agent, possibly someone else per the playbook). Until setTurn() is called,
        // this frame is not routed — the gap is one microtask round trip (~0ms).
      }
    }
  }

  /**
   * Route a frame from the current speaker to all other agents + public room.
   *
   * All destinations use the FIFO queue (safeCaptureFrame is now synchronous) so
   * no destination can block the main for-await loop. Each destination drains
   * independently at its own rate via an async drain loop.
   */
  private broadcast(speakingAgentId: string, frame: AudioFrame): void {
    for (const [agentId, conn] of this.calls) {
      if (agentId === speakingAgentId) continue
      this.safeCaptureFrame(`${speakingAgentId}→${agentId}`, conn.injectSource, frame)
    }

    const publicSrc = this.publicSources.get(speakingAgentId)
    if (publicSrc) {
      this.safeCaptureFrame(`public:${speakingAgentId}`, publicSrc, frame)
    }
  }

  /**
   * Safely push one frame to a destination AudioSource via a bounded FIFO queue.
   *
   * Each destination has an independent 5-frame (100ms) queue and a single async
   * drain loop. Incoming frames are enqueued synchronously; the drain loop processes
   * them one-at-a-time. If captureFrame takes longer than the 20ms frame interval,
   * up to 5 frames absorb the backlog before the oldest is dropped — tolerating
   * up to ~120ms of latency spikes (e.g. Railway → Retell network jitter) without
   * any audible gap.
   *
   * Compared to the previous latest-wins 1-slot design, this prevents frame drops
   * whenever captureFrame takes >40ms (2× frame interval).
   */
  private safeCaptureFrame(label: string, src: AudioSource, frame: AudioFrame): void {
    const MAX_QUEUE = 5

    // Always copy — the caller's frame buffer may be reused
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

    if (queue.length >= MAX_QUEUE) {
      queue.shift()  // drop oldest to make room
    }
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
    } finally {
      this.queueDraining.delete(label)
    }
  }

  private computeRMS(frame: AudioFrame): number {
    let sum = 0
    for (const s of frame.data) sum += s * s
    return Math.sqrt(sum / (frame.data.length || 1))
  }

  /**
   * Inject synthesized PCM audio into a specific agent's call as user audio.
   * Used for audience questions routed to the moderator.
   */
  async injectAudio(agentId: string, pcmBuffer: Buffer): Promise<void> {
    const conn = this.calls.get(agentId)
    if (!conn) return

    const int16 = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2)
    for (let offset = 0; offset < int16.length; offset += FRAME_SAMPLES) {
      const end = Math.min(offset + FRAME_SAMPLES, int16.length)
      const chunk = new Int16Array(end - offset)
      chunk.set(int16.subarray(offset, end))
      this.safeCaptureFrame(
        `inject:${agentId}`,
        conn.injectSource,
        new AudioFrame(chunk, SAMPLE_RATE, NUM_CHANNELS, chunk.length),
      )
    }
  }

  async disconnect(): Promise<void> {
    this.stopped = true
    this.clearTurnTimeout()
    // Unblock any turn the conductor is awaiting — allows run() to reach cleanup()
    this.advanceTurn('relay disconnected')
    this.onTurnEnd = null
    for (const conn of this.calls.values()) {
      await conn.room.disconnect().catch(() => {})
    }
    this.calls.clear()
    for (const room of this.publicRooms.values()) {
      await room.disconnect().catch(() => {})
    }
    this.publicRooms.clear()
    this.frameQueues.clear()
    log.info('AudioRelay disconnected')
  }

  get isActive(): boolean {
    return !this.stopped && this.calls.size > 0
  }
}
