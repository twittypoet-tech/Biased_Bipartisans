'use client'

import { useRef, useState } from 'react'

interface AgentIntroPlayerProps {
  agentId: string
  agentName: string
  initialAudioUrl: string | null
}

type PlayerState = 'idle' | 'loading' | 'connecting' | 'playing' | 'done' | 'error'

export function AgentIntroPlayer({ agentId, agentName, initialAudioUrl }: AgentIntroPlayerProps) {
  const [state, setState] = useState<PlayerState>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const roomRef = useRef<{ disconnect: () => void } | null>(null)
  const callIdRef = useRef<string | null>(null)

  const playAudio = (url: string) => {
    // Reuse or create the audio element
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
    } else {
      audioRef.current.src = url
    }
    audioRef.current.currentTime = 0
    audioRef.current.onended = () => setState('done')
    audioRef.current.onerror = () => setState('error')
    audioRef.current.play().then(() => setState('playing')).catch(() => setState('error'))
  }

  const handlePlay = async () => {
    if (state === 'loading' || state === 'connecting' || state === 'playing') return

    if (initialAudioUrl) {
      playAudio(initialAudioUrl)
      return
    }

    setState('loading')
    try {
      const res = await fetch(`/api/agent-intro/${agentId}`, { method: 'POST' })
      if (!res.ok) { setState('error'); return }

      const data = await res.json()

      if (data.type === 'audio') {
        playAudio(data.url)
        return
      }

      // Connect to Retell via LiveKit WebRTC
      setState('connecting')
      callIdRef.current = data.callId

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
        // Cache the recording for future visitors
        if (callIdRef.current) {
          fetch(`/api/agent-intro/${agentId}/collect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callId: callIdRef.current }),
          }).catch(() => {})
        }
      })

      await room.connect(data.retellUrl, data.accessToken)

      // Disconnect after 90s max
      setTimeout(() => room.disconnect(), 90_000)
    } catch {
      setState('error')
    }
  }

  const handleReplay = () => {
    if (!initialAudioUrl) return
    playAudio(initialAudioUrl)
  }

  const isActive = state === 'loading' || state === 'connecting' || state === 'playing'

  return (
    <div className="flex items-center gap-3">
      {/* Play / Replay button */}
      {state !== 'playing' && state !== 'loading' && state !== 'connecting' ? (
        <button
          onClick={state === 'done' && initialAudioUrl ? handleReplay : handlePlay}
          className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/60 px-3.5 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-neutral-500 hover:bg-neutral-800 hover:text-white"
        >
          {state === 'done' ? <ReplayIcon /> : <PlayIcon />}
          {state === 'done' ? 'Replay intro' : `Hear ${agentName.split(' ')[1] ?? agentName}'s intro`}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <AudioWaveform active={isActive} />
          <span className="text-xs text-neutral-400">
            {state === 'loading' && 'Preparing…'}
            {state === 'connecting' && 'Connecting…'}
            {state === 'playing' && `${agentName} is speaking…`}
          </span>
        </div>
      )}

      {state === 'error' && (
        <span className="text-xs text-neutral-600">Intro unavailable</span>
      )}
    </div>
  )
}

function AudioWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0.5, 0.85, 0.6, 1, 0.7, 0.9, 0.55].map((h, i) => (
        <div
          key={i}
          className={`w-0.5 rounded-full bg-green-400 transition-all ${active ? 'animate-pulse' : 'opacity-30'}`}
          style={{
            height: `${h * 100}%`,
            animationDelay: `${i * 80}ms`,
            animationDuration: '700ms',
          }}
        />
      ))}
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
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
