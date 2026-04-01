import {
  Room,
  RoomEvent,
  AudioStream,
  AudioSource,
  AudioFrame,
  LocalAudioTrack,
  TrackPublishOptions,
  TrackKind,
} from '@livekit/rtc-node'
import { createLogger } from '@bipi/shared'
import { RETELL_LIVEKIT_URL } from './audio-relay.js'

const log = createLogger('agents:retell:reporter-relay')

const SAMPLE_RATE = 24000
const NUM_CHANNELS = 1

export interface ReporterRelayConfig {
  wireAccessToken: string
  reporterAccessToken: string
}

/**
 * Connects the Wire Host and The Reporter to the same audio session.
 *
 * The Wire Host speaks a greeting immediately on call connect, which
 * is routed into The Reporter's call as "user" audio. This prevents
 * Retell's `Error_no_audio_received` timeout that fires when the
 * Reporter is silently searching before delivering its first word.
 *
 * Once the Wire Host disconnects (after its greeting), the relay stops.
 * The Reporter's call continues independently for the full broadcast.
 */
export class ReporterRelay {
  private wireRoom:             Room | null = null
  private reporterRoom:         Room | null = null
  private reporterInjectSource: AudioSource | null = null
  private stopped = false
  private safetyTimeout: ReturnType<typeof setTimeout> | null = null

  async start(config: ReporterRelayConfig): Promise<void> {
    const { wireAccessToken, reporterAccessToken } = config

    // ── 1. Connect to Reporter's room ────────────────────────────────────────
    // Publish an inject source — frames pushed here become "user" audio
    // inside The Reporter's Retell call, so the Reporter "hears" the Wire.
    this.reporterInjectSource = new AudioSource(SAMPLE_RATE, NUM_CHANNELS)
    this.reporterRoom = new Room()

    await this.reporterRoom.connect(RETELL_LIVEKIT_URL, reporterAccessToken, {
      autoSubscribe: false,
      dynacast:      false,
    })

    const injectTrack = LocalAudioTrack.createAudioTrack('wire-intro', this.reporterInjectSource)
    await this.reporterRoom.localParticipant!.publishTrack(injectTrack, new TrackPublishOptions())
    log.info('Reporter room connected — inject source ready')

    // ── 2. Connect to Wire's room and pipe its audio to the Reporter ─────────
    this.wireRoom = new Room()

    this.wireRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== TrackKind.KIND_AUDIO) return
      log.info('Wire audio track live — piping to Reporter')
      this.pipeAudio(new AudioStream(track)).catch((err) => {
        if (!this.stopped) log.warn('Wire audio pipe ended', { err: String(err) })
      })
    })

    this.wireRoom.on(RoomEvent.Disconnected, () => {
      log.info('Wire Host disconnected — relay complete')
      this.stop()
    })

    await this.wireRoom.connect(RETELL_LIVEKIT_URL, wireAccessToken, {
      autoSubscribe: true,
      dynacast:      false,
    })
    log.info('Wire room connected — relay active')

    // Safety timeout: disconnect after 3 minutes regardless
    this.safetyTimeout = setTimeout(() => {
      log.warn('Reporter relay safety timeout — stopping')
      this.stop()
    }, 3 * 60 * 1000)
  }

  private async pipeAudio(stream: AudioStream): Promise<void> {
    for await (const frame of stream) {
      if (this.stopped || !this.reporterInjectSource) break
      this.reporterInjectSource.captureFrame(frame as AudioFrame)
    }
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    if (this.safetyTimeout) clearTimeout(this.safetyTimeout)
    this.wireRoom?.disconnect()
    this.reporterRoom?.disconnect()
    this.wireRoom             = null
    this.reporterRoom         = null
    this.reporterInjectSource = null
    log.info('ReporterRelay stopped')
  }
}
