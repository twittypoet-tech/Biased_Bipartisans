import { createLogger } from '@bipi/shared'
import type { TurnResult } from '../debate/orchestrator.js'
import type { VoiceProvider } from '../voice/types.js'
import { getVoiceId } from '../voice/voice-map.js'
import { LiveKitRoomManager } from './room-manager.js'
import { AudioPublisher } from './audio-publisher.js'
import { uploadTurnAudio } from '../services/audio-storage.js'

const log = createLogger('agents:debate-room')

/** Agent info needed to set up voice publishing */
export interface VoiceAgent {
  agentId: string
  name: string
  archetype: string
  voiceId: string | null
}

/**
 * Bridges the DebateOrchestrator with a LiveKit room.
 *
 * Handles room lifecycle (create → broadcast turns → delete) and
 * provides callback functions that plug directly into the orchestrator's
 * onTurnComplete / onDebateComplete hooks.
 *
 * When voice is enabled, each agent joins the room as a named participant
 * and synthesizes + publishes audio for each turn.
 */
export class DebateRoomBridge {
  private roomManager: LiveKitRoomManager
  private roomName: string | null = null
  private voiceProvider: VoiceProvider | null = null
  private publishers: Map<string, AudioPublisher> = new Map()
  private agentVoices: Map<string, string> = new Map() // agentId → voiceId

  constructor(voiceProvider?: VoiceProvider) {
    this.roomManager = new LiveKitRoomManager()
    this.voiceProvider = voiceProvider ?? null
  }

  /**
   * Create the LiveKit room for a debate.
   */
  async connect(roomName: string): Promise<void> {
    this.roomName = roomName
    await this.roomManager.createRoom(roomName)
    log.info(`Connected to room: ${roomName}`)
  }

  /**
   * Set up voice publishers for each agent.
   * Call after connect() and before the debate starts.
   */
  async setupVoiceAgents(agents: VoiceAgent[]): Promise<void> {
    if (!this.voiceProvider || !this.roomName) return

    const livekitUrl = process.env.LIVEKIT_URL
    if (!livekitUrl) {
      log.warn('LIVEKIT_URL not set — skipping voice agent setup')
      return
    }

    for (const agent of agents) {
      const voiceId = getVoiceId(agent.voiceId, agent.archetype)
      this.agentVoices.set(agent.agentId, voiceId)

      const publisher = new AudioPublisher(agent.name)
      const token = await this.roomManager.generateToken(
        this.roomName,
        agent.name,
        `agent-${agent.name.toLowerCase().replace(/\s+/g, '-')}`,
        'publisher',
      )

      try {
        await publisher.connect(livekitUrl, token)
        this.publishers.set(agent.agentId, publisher)
        log.info(`Voice publisher ready: ${agent.name} (voice: ${voiceId})`)
      } catch (err) {
        log.warn(`Failed to connect voice publisher for ${agent.name}`, { error: String(err) })
      }
    }
  }

  /**
   * Publish a turn to all connected audience members.
   * If voice is enabled, synthesizes audio, publishes to LiveKit, and
   * persists to Supabase Storage. Returns the audio URL if saved.
   */
  async publishTurn(turn: TurnResult, debateId: string): Promise<string | null> {
    if (!this.roomName) return null

    let audioUrl: string | null = null

    // Synthesize + publish audio if voice is enabled
    if (this.voiceProvider) {
      const publisher = this.publishers.get(turn.speakerId)
      const voiceId = this.agentVoices.get(turn.speakerId)

      if (voiceId) {
        try {
          const result = await this.voiceProvider.synthesize(turn.transcript, voiceId)

          // Publish live to LiveKit room
          if (publisher?.isConnected) {
            await publisher.publishAudio(result.audio)
            log.debug(`Published ${result.durationMs}ms audio for ${turn.speakerName}`)
          }

          // Persist to Supabase Storage for playback later
          audioUrl = await uploadTurnAudio(debateId, turn.turnIndex, turn.speakerName, result.audio)
        } catch (err) {
          log.warn(`TTS failed for ${turn.speakerName}, text-only fallback`, { error: String(err) })
        }
      }
    }

    // Send text data (include audioUrl so late-joining clients can fetch it)
    await this.roomManager.sendData(this.roomName, {
      type: 'turn',
      speakerName: turn.speakerName,
      speakerId: turn.speakerId,
      archetype: turn.archetype,
      roundPhase: turn.roundPhase,
      turnIndex: turn.turnIndex,
      transcript: turn.transcript,
      isModerator: turn.isModerator,
      audioUrl,
      timestamp: new Date().toISOString(),
    })

    return audioUrl
  }

  /**
   * Publish a round completion event.
   */
  async publishRoundComplete(phase: string, summary: string): Promise<void> {
    if (!this.roomName) return

    await this.roomManager.sendData(this.roomName, {
      type: 'round_complete',
      phase,
      summary,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Clean up: disconnect all voice publishers and delete the room.
   */
  async disconnect(): Promise<void> {
    if (!this.roomName) return

    await this.roomManager.sendData(this.roomName, {
      type: 'debate_complete',
      timestamp: new Date().toISOString(),
    })

    // Disconnect all voice publishers
    for (const [agentId, publisher] of this.publishers) {
      await publisher.disconnect()
    }
    this.publishers.clear()
    this.agentVoices.clear()

    await this.roomManager.deleteRoom(this.roomName)
    log.info(`Disconnected from room: ${this.roomName}`)
    this.roomName = null
  }

  /**
   * Generate an audience token for the current room.
   */
  async getAudienceToken(viewerName: string, viewerId: string): Promise<string> {
    if (!this.roomName) throw new Error('Not connected to a room')
    return this.roomManager.generateToken(this.roomName, viewerName, viewerId, 'subscriber')
  }

  /** Whether voice is enabled for this bridge */
  get voiceEnabled(): boolean {
    return this.voiceProvider !== null
  }
}
