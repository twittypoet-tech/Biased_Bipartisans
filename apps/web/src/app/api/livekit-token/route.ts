import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

/**
 * Generate a subscriber-only LiveKit token for audience members.
 */
export async function POST(request: Request) {
  try {
    const { roomName, viewerName, debateId } = await request.json()

    if (!roomName || !viewerName) {
      return NextResponse.json({ error: 'Missing roomName or viewerName' }, { status: 400 })
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit not configured' }, { status: 503 })
    }

    const identity = `viewer-${debateId}-${Math.random().toString(36).slice(2, 8)}`

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: viewerName,
      ttl: '4h',
    })

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: false,
      canPublishData: false,
      canSubscribe: true,
    })

    const jwt = await token.toJwt()

    return NextResponse.json({ token: jwt })
  } catch (err) {
    console.error('LiveKit token error:', err)
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
  }
}
