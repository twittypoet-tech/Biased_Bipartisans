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
 */
const MIN_SILENCE_BEFORE_HANDOFF_MS = 1500

/**
 * If nobody starts speaking within this many ms after the current speaker
 * goes silent, advance the turn anyway (safety fallback).
 */
const TURN_TIMEOUT_MS = 5000

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
  private onTurnEnd: (() => void) | null = null
  private currentSpeakerSilentSince: number | null = null  // epoch ms
  private turnTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private turnAdvanced = false  // guard: only advance once per turn

  // Per-destination concurrency lock — prevents concurrent captureFrame on same AudioSource
  private capturingNow = new Set<string>()

  // Per-destination pending frame — latest-wins instead of dropping on collision
  private pendingFrames = new Map<string, AudioFrame>()

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
  setTurn(agentId: string, onTurnEnd: () => void): void {
    this.clearTurnTimeout()
    this.currentTurnAgentId = agentId
    this.currentSpeakerSilentSince = null
    this.onTurnEnd = onTurnEnd
    this.turnAdvanced = false
    const name = this.calls.get(agentId)?.meta.agentName ?? agentId
    log.info(`Turn → ${name}`)
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

  private async routeFrame(speakingAgentId: string, frame: AudioFrame): Promise<void> {
    const isTurnSpeaker = speakingAgentId === this.currentTurnAgentId
    const rms = this.computeRMS(frame)
    const now = Date.now()

    if (isTurnSpeaker) {
      if (rms > SPEECH_RMS_THRESHOLD) {
        // Active speech — reset silence window, route to everyone
        this.currentSpeakerSilentSince = null
        this.clearTurnTimeout()
        await this.broadcast(speakingAgentId, frame)
      } else {
        // Silence — start tracking
        if (this.currentSpeakerSilentSince === null) {
          this.currentSpeakerSilentSince = now
        }
        const silentMs = now - this.currentSpeakerSilentSince

        // After MIN_SILENCE_BEFORE_HANDOFF_MS, arm the fallback timeout once.
        // If a different agent starts speaking before the timeout, advanceTurn()
        // fires from the non-turn-speaker branch below (catching them at word one).
        if (silentMs >= MIN_SILENCE_BEFORE_HANDOFF_MS && !this.turnTimeoutTimer && this.onTurnEnd) {
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
        rms > SPEECH_RMS_THRESHOLD
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
   * Inject sources (Retell agent calls) are fire-and-forget — we do NOT await them.
   * Awaiting all destinations in Promise.all meant slow Retell connections (inject writes
   * crossing network to Retell's LiveKit server) blocked the main for-await loop.
   * When the loop fell behind, frames arrived in bursts that triggered Retell's barge-in
   * detection repeatedly, producing fragmented/choppy agent speech in both the public
   * room and Retell's own recordings.
   *
   * Each inject destination has its own capturingNow lock + pendingFrames slot, so it
   * processes frames independently at its own rate — smooth, no gaps, no bursts.
   * The main loop now paces only with the public room write (our own fast LiveKit server).
   */
  private async broadcast(speakingAgentId: string, frame: AudioFrame): Promise<void> {
    // Inject sources: fire-and-forget — decouple from main loop entirely
    for (const [agentId, conn] of this.calls) {
      if (agentId === speakingAgentId) continue
      void this.safeCaptureFrame(`${speakingAgentId}→${agentId}`, conn.injectSource, frame)
    }

    // Public room: awaited — paces the main loop at a stable cadence
    const publicSrc = this.publicSources.get(speakingAgentId)
    if (publicSrc) {
      await this.safeCaptureFrame(`public:${speakingAgentId}`, publicSrc, frame)
    }
  }

  /**
   * Safely push one frame to a destination AudioSource.
   *
   * Concurrent captureFrame on the same AudioSource causes InvalidState, so only
   * one write per destination runs at a time. Rather than dropping frames on
   * collision (which causes choppiness), we use a latest-wins pending slot:
   *   - If a write is in progress, store the incoming frame as pending (overwriting
   *     any previously pending frame — latest wins).
   *   - When the current write completes, immediately write the pending frame if
   *     one arrived while we were busy.
   *
   * This ensures audio is continuous (no gaps) even when captureFrame takes
   * slightly longer than the 20ms frame interval. At most one frame of latency
   * (~20ms) is added, which is imperceptible.
   */
  private async safeCaptureFrame(
    label: string,
    src: AudioSource,
    frame: AudioFrame,
  ): Promise<void> {
    // Always copy — the caller's frame buffer may be reused
    const copy = new AudioFrame(
      new Int16Array(frame.data),
      frame.sampleRate,
      frame.channels,
      frame.samplesPerChannel,
    )

    if (this.capturingNow.has(label)) {
      this.pendingFrames.set(label, copy)  // latest wins
      return
    }

    this.capturingNow.add(label)
    let toWrite: AudioFrame | undefined = copy
    try {
      while (toWrite && !this.stopped) {
        await src.captureFrame(toWrite)
        toWrite = this.pendingFrames.get(label)
        this.pendingFrames.delete(label)
      }
    } catch (err) {
      this.pendingFrames.delete(label)
      if (!this.stopped) {
        const now = Date.now()
        const last = this.lastWarnTime.get(label) ?? 0
        if (now - last > 5000) {
          const msg = err instanceof Error ? err.message : String(err)
          log.warn(`captureFrame failed [${label}]: ${msg}`)
          this.lastWarnTime.set(label, now)
        }
      }
    } finally {
      this.capturingNow.delete(label)
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
      await this.safeCaptureFrame(
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
    log.info('AudioRelay disconnected')
  }

  get isActive(): boolean {
    return !this.stopped && this.calls.size > 0
  }
}
