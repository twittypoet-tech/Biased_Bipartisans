'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Connects to a LiveKit room as a subscriber and receives debate turn data
 * messages in real time. Falls back gracefully if LiveKit is not configured.
 */

interface LiveTurn {
  type: 'turn' | 'round_complete' | 'debate_complete'
  speakerName?: string
  speakerId?: string
  archetype?: string
  roundPhase?: string
  turnIndex?: number
  transcript?: string
  isModerator?: boolean
  phase?: string
  summary?: string
  timestamp: string
}

interface LiveKitListenerProps {
  debateId: string
  roomName: string
  onTurn: (turn: LiveTurn) => void
}

export function LiveKitListener({ debateId, roomName, onTurn }: LiveKitListenerProps) {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    try {
      // Get a subscriber token from our API
      const res = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          viewerName: `viewer-${Math.random().toString(36).slice(2, 8)}`,
          debateId,
        }),
      })

      if (!res.ok) {
        setError('Could not get LiveKit token')
        return
      }

      const { token } = await res.json()
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

      if (!livekitUrl || !token) {
        setError('LiveKit not configured')
        return
      }

      // Dynamic import to avoid SSR issues
      const { Room, RoomEvent } = await import('livekit-client')

      const room = new Room()
      await room.connect(livekitUrl, token)
      setConnected(true)

      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const text = new TextDecoder().decode(payload)
          const data = JSON.parse(text) as LiveTurn
          onTurn(data)
        } catch {
          // Ignore malformed data
        }
      })

      room.on(RoomEvent.Disconnected, () => {
        setConnected(false)
      })

      // Cleanup on unmount
      return () => {
        room.disconnect()
      }
    } catch (err) {
      setError('Failed to connect to live room')
      console.error('LiveKit connection error:', err)
    }
  }, [debateId, roomName, onTurn])

  useEffect(() => {
    let cleanup: (() => void) | undefined

    connect().then((fn) => {
      if (fn) cleanup = fn
    })

    return () => {
      cleanup?.()
    }
  }, [connect])

  if (error) {
    return (
      <div className="rounded border border-yellow-900/50 bg-yellow-950/20 px-3 py-2 text-xs text-yellow-500">
        Live updates unavailable: {error}
      </div>
    )
  }

  if (connected) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-500">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        Connected to live room
      </div>
    )
  }

  return (
    <div className="text-xs text-neutral-500">Connecting to live room...</div>
  )
}
