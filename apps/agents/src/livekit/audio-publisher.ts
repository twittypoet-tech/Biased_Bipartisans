import { Room, LocalAudioTrack, AudioSource, AudioFrame, TrackPublishOptions } from '@livekit/rtc-node'
import { createLogger } from '@bipi/shared'

const log = createLogger('agents:audio-publisher')

/** TTS PCM format: 24kHz, 16-bit, mono */
const TTS_SAMPLE_RATE = 24000
const TTS_NUM_CHANNELS = 1
const BYTES_PER_SAMPLE = 2

/** How many samples per frame we push (20ms chunks at 24kHz = 480 samples) */
const SAMPLES_PER_FRAME = 480

/**
 * Connects to a LiveKit room as a named participant and publishes
 * synthesized audio. Each agent gets its own AudioPublisher.
 */
export class AudioPublisher {
  private room: Room
  private _audioSource: AudioSource | null = null
  private track: LocalAudioTrack | null = null
  private connected = false
  private identity: string

  constructor(private agentName: string) {
    this.room = new Room()
    this.identity = `agent-${agentName.toLowerCase().replace(/\s+/g, '-')}`
  }

  /**
   * Connect to a LiveKit room as a named participant with audio publishing capability.
   */
  async connect(url: string, token: string): Promise<void> {
    if (this.connected) return

    await this.room.connect(url, token, { autoSubscribe: false, dynacast: false })
    log.info(`${this.agentName} connected to room as ${this.identity}`)

    // Create audio source and track
    this._audioSource = new AudioSource(TTS_SAMPLE_RATE, TTS_NUM_CHANNELS)
    this.track = LocalAudioTrack.createAudioTrack(`voice-${this.identity}`, this._audioSource)

    // Publish the audio track
    const options = new TrackPublishOptions()
    await this.room.localParticipant!.publishTrack(this.track, options)
    log.info(`${this.agentName} published audio track`)

    this.connected = true
  }

  /**
   * Expose the AudioSource so StreamingTTSPublisher can push frames directly,
   * enabling real-time frame-by-frame publishing as ElevenLabs synthesizes audio.
   */
  get audioSource(): AudioSource | null {
    return this._audioSource
  }

  /**
   * Push a PCM audio buffer to the LiveKit room.
   * The buffer should be 24kHz, 16-bit signed LE, mono PCM data
   * (as returned by OpenAI TTS with response_format='pcm').
   *
   * Splits the buffer into 20ms frames and pushes them sequentially.
   */
  async publishAudio(pcmBuffer: Buffer): Promise<void> {
    if (!this._audioSource) {
      log.warn(`${this.agentName}: Cannot publish audio — not connected`)
      return
    }

    const int16Data = new Int16Array(
      pcmBuffer.buffer,
      pcmBuffer.byteOffset,
      pcmBuffer.length / BYTES_PER_SAMPLE,
    )

    const totalSamples = int16Data.length

    // Push in 20ms chunks
    for (let offset = 0; offset < totalSamples; offset += SAMPLES_PER_FRAME) {
      const remaining = totalSamples - offset
      const chunkSize = Math.min(SAMPLES_PER_FRAME, remaining)

      const frameData = new Int16Array(chunkSize)
      frameData.set(int16Data.subarray(offset, offset + chunkSize))

      const frame = new AudioFrame(frameData, TTS_SAMPLE_RATE, TTS_NUM_CHANNELS, chunkSize)
      await this._audioSource.captureFrame(frame)
    }

    // Wait for all audio to finish playing
    await this._audioSource.waitForPlayout()
  }

  /**
   * Disconnect from the room.
   */
  async disconnect(): Promise<void> {
    if (!this.connected) return

    try {
      await this.room.disconnect()
    } catch (err) {
      log.warn(`Error disconnecting ${this.agentName}`, { error: String(err) })
    }

    this._audioSource = null
    this.track = null
    this.connected = false
    log.info(`${this.agentName} disconnected`)
  }

  get isConnected(): boolean {
    return this.connected
  }
}
