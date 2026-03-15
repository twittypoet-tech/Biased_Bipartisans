import { createLogger } from '@bipi/shared'
import type { TurnResult } from '../debate/orchestrator.js'
import { LiveKitRoomManager } from './room-manager.js'
import { AudioPublisher } from './audio-publisher.js'

const log = createLogger('agents:debate-room')

/** Agent info needed to set up voice publishing */
export interface VoiceAgent {
  agentId: string
  name: string
  archetype: string
  voiceId: string | null
}

/**
 * Bridges the DebateOrchestrator with a LiveKit room for live streaming.
 *
 * Handles room lifecycle (create → broadcast turns → delete) and
 * live audio publishing. TTS synthesis happens externally (VoiceSynthesizer);
 * this bridge just publishes pre-synthesized PCM to the room.
 */
export class DebateRoomBridge {
  private roomManager: LiveKitRoomManager
  private roomName: string | null = null
  private publishers: Map<string, AudioPublisher> = new Map()

  constructor() {
    this.roomManager = new LiveKitRoomManager()
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
   * Set up audio publishers for each agent in the LiveKit room.
   * Call after connect() and before the debate starts.
   */
  async setupVoicePublishers(agents: VoiceAgent[]): Promise<void> {
    if (!this.roomName) return

    const livekitUrl = process.env.LIVEKIT_URL
    if (!livekitUrl) {
      log.warn('LIVEKIT_URL not set — skipping voice publisher setup')
      return
    }

    for (const agent of agents) {
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
        log.info(`Audio publisher ready: ${agent.name}`)
      } catch (err) {
        log.warn(`Failed to connect audio publisher for ${agent.name}`, { error: String(err) })
      }
    }
  }

  /**
   * Publish pre-synthesized PCM audio to the LiveKit room for an agent.
   */
  async publishAudio(speakerId: string, pcmBuffer: Buffer): Promise<void> {
    const publisher = this.publishers.get(speakerId)
    if (publisher?.isConnected) {
      try {
        await publisher.publishAudio(pcmBuffer)
      } catch (err) {
        log.warn(`Failed to publish audio for ${speakerId}`, { error: String(err) })
      }
    }
  }

  /**
   * Broadcast turn data (text + metadata) to all connected audience members.
   */
  async broadcastTurnData(turn: TurnResult, audioUrl: string | null): Promise<void> {
    if (!this.roomName) return

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
   * Clean up: disconnect all publishers and delete the room.
   */
  async disconnect(): Promise<void> {
    if (!this.roomName) return

    await this.roomManager.sendData(this.roomName, {
      type: 'debate_complete',
      timestamp: new Date().toISOString(),
    })

    for (const [, publisher] of this.publishers) {
      await publisher.disconnect()
    }
    this.publishers.clear()

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
}
