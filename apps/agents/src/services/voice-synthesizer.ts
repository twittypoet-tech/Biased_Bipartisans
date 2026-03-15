import { createLogger } from '@bipi/shared'
import type { VoiceProvider } from '../voice/types.js'
import { getVoiceId } from '../voice/voice-map.js'
import { uploadTurnAudio } from './audio-storage.js'

const log = createLogger('agents:voice-synthesizer')

export interface SynthesizedTurn {
  /** Public URL of the stored WAV file, or null if upload failed */
  audioUrl: string | null
  /** Raw PCM buffer for live streaming (LiveKit), or null */
  pcmBuffer: Buffer | null
  /** Duration in ms */
  durationMs: number
}

/**
 * Standalone voice synthesizer that generates TTS audio and saves it
 * to Supabase Storage. Works independently of LiveKit.
 *
 * Call synthesizeTurn() for each debate turn to get audio.
 * The returned pcmBuffer can optionally be pushed to LiveKit for live playback.
 */
export class VoiceSynthesizer {
  private voiceProvider: VoiceProvider
  private agentVoices = new Map<string, string>()

  constructor(voiceProvider: VoiceProvider) {
    this.voiceProvider = voiceProvider
  }

  /**
   * Register voice IDs for agents. Call once before the debate starts.
   */
  registerAgents(agents: Array<{ agentId: string; archetype: string; voiceId: string | null }>) {
    for (const agent of agents) {
      const voiceId = getVoiceId(agent.voiceId, agent.archetype)
      this.agentVoices.set(agent.agentId, voiceId)
      log.info(`Registered voice for ${agent.agentId}: ${voiceId}`)
    }
  }

  /**
   * Synthesize speech for a turn, upload to storage, return the result.
   */
  async synthesizeTurn(
    debateId: string,
    speakerId: string,
    speakerName: string,
    turnIndex: number,
    transcript: string,
  ): Promise<SynthesizedTurn> {
    const voiceId = this.agentVoices.get(speakerId)
    if (!voiceId) {
      log.warn(`No voice registered for speaker ${speakerId}`)
      return { audioUrl: null, pcmBuffer: null, durationMs: 0 }
    }

    try {
      const result = await this.voiceProvider.synthesize(transcript, voiceId)

      if (result.audio.length === 0) {
        return { audioUrl: null, pcmBuffer: null, durationMs: 0 }
      }

      // Upload to Supabase Storage
      const audioUrl = await uploadTurnAudio(debateId, turnIndex, speakerName, result.audio)

      log.info(`Synthesized ${result.durationMs}ms audio for ${speakerName} (turn ${turnIndex})`)

      return {
        audioUrl,
        pcmBuffer: result.audio,
        durationMs: result.durationMs,
      }
    } catch (err) {
      log.warn(`TTS synthesis failed for ${speakerName}`, { error: String(err) })
      return { audioUrl: null, pcmBuffer: null, durationMs: 0 }
    }
  }
}
