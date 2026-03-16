'use client'

import { useEffect, useRef, useState } from 'react'

interface AgentIntroPlayerProps {
  agentId: string
  agentName: string
  initialAudioUrl: string | null
}

type PlayerState = 'idle' | 'loading' | 'connecting' | 'playing' | 'done' | 'error'

export function AgentIntroPlayer({ agentId, agentName, initialAudioUrl }: AgentIntroPlayerProps) {
  const [state, setState] = useState<PlayerState>('idle')
  const audioRef = useRef<HTMLAudioElement>(null)
  const roomRef = useRef<unknown>(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    if (initialAudioUrl) {
      setState('playing')
      return
    }

    startIntro()
  }, [])

  const startIntro = async () => {
    setState('loading')
    try {
      const res = await fetch(`/api/agent-intro/${agentId}`, { method: 'POST' })
      if (!res.ok) {
        setState('error')
        return
      }

      const data = await res.json()

      if (data.type === 'audio') {
        // Another session already generated and saved it — just play it
        if (audioRef.current) {
          audioRef.current.src = data.url
          audioRef.current.play().catch(() => {})
        }
        setState('playing')
        return
      }

      // Connect to Retell via LiveKit
      setState('connecting')
      const { Room, RoomEvent, Track } = await import('livekit-client')
      const room = new Room({ adaptiveStream: false, dynacast: false })
      roomRef.current = room

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach()
          el.autoplay = true
          el.style.display = 'none'
          document.body.appendChild(el)
          setState('playing')
        }
      })

      room.on(RoomEvent.Disconnected, () => {
        setState('done')
        // Try to collect and cache the recording
        fetch(`/api/agent-intro/${agentId}/collect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: data.callId }),
        }).catch(() => {})
      })

      await room.connect(data.retellUrl, data.accessToken)

      // Disconnect after 60s max
      setTimeout(() => {
        room.disconnect()
      }, 60_000)
    } catch {
      setState('error')
    }
  }

  const handleReplay = () => {
    if (initialAudioUrl && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      setState('playing')
    }
  }

  if (initialAudioUrl) {
    return (
      <div className="flex items-center gap-3">
        <audio
          ref={audioRef}
          src={initialAudioUrl}
          autoPlay
          onEnded={() => setState('done')}
          className="hidden"
        />
        <div className="flex items-center gap-2">
          {state !== 'done' ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-neutral-400">{agentName} is speaking…</span>
            </>
          ) : (
            <>
              <button
                onClick={handleReplay}
                className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
              >
                <ReplayIcon />
                Replay intro
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      {state === 'loading' && (
        <>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-600 animate-pulse" />
          Preparing intro…
        </>
      )}
      {state === 'connecting' && (
        <>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
          Connecting…
        </>
      )}
      {state === 'playing' && (
        <>
          <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-neutral-300">{agentName} is speaking…</span>
        </>
      )}
      {state === 'done' && (
        <span className="text-neutral-600">Intro complete</span>
      )}
      {state === 'error' && (
        <span className="text-neutral-600">Intro unavailable</span>
      )}
    </div>
  )
}

function ReplayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
    </svg>
  )
}
