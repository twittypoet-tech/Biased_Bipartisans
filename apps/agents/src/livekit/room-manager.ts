import { RoomServiceClient, AccessToken, DataPacket_Kind } from 'livekit-server-sdk'
import { createLogger } from '@bipi/shared'

const log = createLogger('agents:livekit')

/**
 * Manages LiveKit rooms for debates.
 *
 * Creates rooms, generates tokens for agents and audience,
 * publishes turn data as data messages, and cleans up on debate end.
 */
export class LiveKitRoomManager {
  private roomService: RoomServiceClient
  private apiKey: string
  private apiSecret: string

  constructor() {
    const host = process.env.LIVEKIT_URL
    this.apiKey = process.env.LIVEKIT_API_KEY ?? ''
    this.apiSecret = process.env.LIVEKIT_API_SECRET ?? ''

    if (!host || !this.apiKey || !this.apiSecret) {
      throw new Error('LiveKit env vars required: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET')
    }

    // RoomServiceClient expects https:// URL, not ws://
    const httpHost = host.replace('ws://', 'http://').replace('wss://', 'https://')
    this.roomService = new RoomServiceClient(httpHost, this.apiKey, this.apiSecret)
  }

  /**
   * Create a LiveKit room for a debate.
   */
  async createRoom(roomName: string): Promise<void> {
    log.info(`Creating room: ${roomName}`)
    await this.roomService.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 min grace period
      maxParticipants: 50,
    })
  }

  /**
   * Generate a token for a participant to join a room.
   */
  async generateToken(
    roomName: string,
    participantName: string,
    identity: string,
    role: 'publisher' | 'subscriber',
  ): Promise<string> {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name: participantName,
      ttl: '4h',
    })

    if (role === 'publisher') {
      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
      })
    } else {
      token.addGrant({
        room: roomName,
        roomJoin: true,
        canPublish: false,
        canPublishData: false,
        canSubscribe: true,
      })
    }

    return token.toJwt()
  }

  /**
   * Send data to all participants in a room (used for broadcasting turns).
   */
  async sendData(roomName: string, payload: Record<string, unknown>): Promise<void> {
    const data = new TextEncoder().encode(JSON.stringify(payload))
    await this.roomService.sendData(roomName, data, DataPacket_Kind.RELIABLE, {
      topic: 'debate-turn',
    })
  }

  /**
   * Delete a room when the debate ends.
   */
  async deleteRoom(roomName: string): Promise<void> {
    log.info(`Deleting room: ${roomName}`)
    await this.roomService.deleteRoom(roomName)
  }

  /**
   * Check if LiveKit is configured.
   */
  static isConfigured(): boolean {
    return !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET)
  }
}
