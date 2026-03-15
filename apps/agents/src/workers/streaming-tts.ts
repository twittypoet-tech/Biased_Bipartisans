import { TTS as ElevenLabsTTS, SynthesizeStream } from '@livekit/agents-plugin-elevenlabs'
import { AudioSource, AudioFrame } from '@livekit/rtc-node'
import { createLogger } from '@bipi/shared'
import { getElevenLabsVoiceId } from './elevenlabs-voice-map.js'

const log = createLogger('agents:streaming-tts')

/** ElevenLabs model — turbo_v2_5 for lowest latency with high quality */
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5'

/**
 * StreamingTTSPublisher replaces VoiceSynthesizer with a true streaming pipeline.
 *
 * Instead of waiting for the full LLM response before synthesizing audio, it:
 *   1. Opens a persistent ElevenLabs WebSocket connection per agent
 *   2. Pipes LLM text chunks to ElevenLabs as they arrive
 *   3. Publishes synthesized audio frames to the LiveKit room in real-time
 *
 * Result: first word heard in ~300-500ms instead of 5-15s.
 *
 * Audio is published via the existing AudioPublisher's AudioSource,
 * preserving per-agent participant identity in the LiveKit room.
 */
export class StreamingTTSPublisher {
  private tts: ElevenLabsTTS

  constructor(voiceId: string) {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is required for StreamingTTSPublisher')
    }

    this.tts = new ElevenLabsTTS({
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId,
      model: ELEVENLABS_MODEL,
      // Sentence tokenizer gives ElevenLabs natural phrase boundaries
      // for higher-quality prosody without waiting for full turn text
      streamingLatency: 3,  // ElevenLabs optimization level 0-4 (higher = lower latency)
    })
  }

  /**
   * Synthesize text from a streaming source and publish audio frames in real-time.
   *
   * @param textStream - Async iterable of text chunks from the LLM (e.g., Anthropic stream)
   * @param audioSource - The LiveKit AudioSource to push frames to
   * @returns The full synthesized transcript (concatenated chunks)
   */
  async synthesizeAndPublish(
    textStream: AsyncIterable<string>,
    audioSource: AudioSource,
  ): Promise<string> {
    const ttsStream = this.tts.stream()
    let fullTranscript = ''

    // Pipe LLM text to ElevenLabs as it arrives
    const pipeTextTask = async () => {
      for await (const chunk of textStream) {
        ttsStream.pushText(chunk)
        fullTranscript += chunk
      }
      ttsStream.flush()
      ttsStream.endInput()
    }

    // Publish audio frames to LiveKit as ElevenLabs synthesizes them
    const publishAudioTask = async () => {
      for await (const audio of ttsStream) {
        if (audio === SynthesizeStream.END_OF_STREAM) break
        if (audio && 'frame' in audio) {
          await audioSource.captureFrame(audio.frame as AudioFrame)
        }
      }
      await audioSource.waitForPlayout()
    }

    // Run both in parallel — piping text does NOT wait for audio; audio starts as soon as text arrives
    await Promise.all([pipeTextTask(), publishAudioTask()])

    return fullTranscript.trim()
  }

  async close(): Promise<void> {
    await this.tts.close()
  }
}

/**
 * Factory to create one StreamingTTSPublisher per agent,
 * keyed by agentId → publisher.
 */
export function createTTSPublishers(
  agents: Array<{ agentId: string; archetype: string; voiceId: string | null }>,
): Map<string, StreamingTTSPublisher> {
  const publishers = new Map<string, StreamingTTSPublisher>()

  for (const agent of agents) {
    const voiceId = getElevenLabsVoiceId(agent.voiceId, agent.archetype)
    try {
      publishers.set(agent.agentId, new StreamingTTSPublisher(voiceId))
      log.info(`TTS publisher created for ${agent.archetype} (voice: ${voiceId})`)
    } catch (err) {
      log.warn(`Failed to create TTS publisher for ${agent.agentId}`, { error: String(err) })
    }
  }

  return publishers
}
