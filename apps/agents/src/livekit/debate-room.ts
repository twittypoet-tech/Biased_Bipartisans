import { createLogger } from '@bipi/shared'
import type { TurnResult } from '../debate/orchestrator.js'
import { LiveKitRoomManager } from './room-manager.js'

const log = createLogger('agents:debate-room')

/**
 * Bridges the DebateOrchestrator with a LiveKit room.
 *
 * Handles room lifecycle (create → broadcast turns → delete) and
 * provides callback functions that plug directly into the orchestrator's
 * onTurnComplete / onDebateComplete hooks.
 */
export class DebateRoomBridge {
  private roomManager: LiveKitRoomManager
  private roomName: string | null = null

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
   * Publish a turn to all connected audience members.
   * Wire this as the orchestrator's onTurnComplete callback.
   */
  async publishTurn(turn: TurnResult): Promise<void> {
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
   * Clean up: delete the room when the debate ends.
   */
  async disconnect(): Promise<void> {
    if (!this.roomName) return

    await this.roomManager.sendData(this.roomName, {
      type: 'debate_complete',
      timestamp: new Date().toISOString(),
    })

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
