'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { SpeakerStage, type StageParticipant } from './speaker-stage'
import { LiveTranscript, type LiveTurnEntry } from './live-transcript'

interface DebateRoomProps {
  debateId: string
  roomName: string
  participants: StageParticipant[]
  /** Pre-loaded turns from the server (catch-up for late joiners) */
  initialTurns: LiveTurnEntry[]
  currentPhase: string | null
}

export function DebateRoom({
  debateId,
  roomName,
  participants,
  initialTurns,
  currentPhase: initialPhase,
}: DebateRoomProps) {
  const [turns, setTurns] = useState<LiveTurnEntry[]>(initialTurns)
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
  const [currentPhase, setCurrentPhase] = useState<string | null>(initialPhase)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'ended'>('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [audioMuted, setAudioMuted] = useState(false)
  const [audienceCount, setAudienceCount] = useState(1)

  const roomRef = useRef<unknown>(null)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  // Map participant identity strings (agent-name-slug) back to participant IDs
  const identityToId = useCallback(
    (identity: string): string | null => {
      for (const p of participants) {
        const slug = `agent-${p.name.toLowerCase().replace(/\s+/g, '-')}`
        if (identity === slug) return p.id
      }
      return null
    },
    [participants],
  )

  const connect = useCallback(async () => {
    try {
      // Get subscriber token
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
        setConnectionStatus('error')
        setErrorMsg('Could not get room token')
        return
      }

      const { token } = await res.json()
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

      if (!livekitUrl || !token) {
        setConnectionStatus('error')
        setErrorMsg('LiveKit not configured')
        return
      }

      // Dynamic import to avoid SSR issues
      const { Room, RoomEvent, Track } = await import('livekit-client')

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

      // --- Audio track subscription: attach to <audio> elements for playback ---
      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioEl = track.attach()
          audioEl.volume = audioMuted ? 0 : 1
          audioElementsRef.current.set(participant.identity, audioEl)
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach().forEach((el) => el.remove())
          audioElementsRef.current.delete(participant.identity)
        }
      })

      // --- Active speaker detection ---
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (speakers.length > 0) {
          // Find the loudest speaker that maps to one of our participants
          for (const speaker of speakers) {
            const pid = identityToId(speaker.identity)
            if (pid) {
              setActiveSpeakerId(pid)
              return
            }
          }
        }
        setActiveSpeakerId(null)
      })

      // --- Data messages (transcript turns, round events) ---
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        try {
          const text = new TextDecoder().decode(payload)
          const data = JSON.parse(text)

          if (data.type === 'turn') {
            const newTurn: LiveTurnEntry = {
              id: `live-${Date.now()}-${data.turnIndex}`,
              speakerName: data.speakerName,
              speakerId: data.speakerId,
              archetype: data.archetype ?? 'unknown',
              roundPhase: data.roundPhase,
              turnIndex: data.turnIndex,
              transcript: data.transcript,
              isModerator: data.isModerator ?? false,
              isNew: true,
            }
            setTurns((prev) => [...prev, newTurn])
            setCurrentPhase(data.roundPhase)
            setActiveSpeakerId(data.speakerId)
          } else if (data.type === 'round_complete') {
            setCurrentPhase(data.phase)
            setActiveSpeakerId(null)
          } else if (data.type === 'debate_complete') {
            setConnectionStatus('ended')
            setActiveSpeakerId(null)
          }
        } catch {
          // Ignore malformed messages
        }
      })

      // --- Participant tracking for audience count ---
      room.on(RoomEvent.ParticipantConnected, () => {
        setAudienceCount(room.numParticipants)
      })
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setAudienceCount(room.numParticipants)
      })

      room.on(RoomEvent.Disconnected, () => {
        setConnectionStatus('error')
        setErrorMsg('Disconnected from room')
      })

      await room.connect(livekitUrl, token)
      roomRef.current = room
      setConnectionStatus('connected')
      setAudienceCount(room.numParticipants)

      // Subscribe to existing tracks (for late joiners)
      for (const participant of room.remoteParticipants.values()) {
        for (const pub of participant.trackPublications.values()) {
          if (pub.track && pub.track.kind === Track.Kind.Audio && pub.isSubscribed) {
            const audioEl = pub.track.attach()
            audioEl.volume = audioMuted ? 0 : 1
            audioElementsRef.current.set(participant.identity, audioEl)
          }
        }
      }

      return () => {
        room.disconnect()
      }
    } catch (err) {
      console.error('DebateRoom connection error:', err)
      setConnectionStatus('error')
      setErrorMsg('Failed to connect to live room')
    }
  }, [debateId, roomName, identityToId, audioMuted])

  useEffect(() => {
    let cleanup: (() => void) | undefined

    connect().then((fn) => {
      if (fn) cleanup = fn
    })

    return () => {
      cleanup?.()
    }
  }, [connect])

  // Sync mute state to all audio elements
  useEffect(() => {
    for (const audioEl of audioElementsRef.current.values()) {
      audioEl.volume = audioMuted ? 0 : 1
    }
  }, [audioMuted])

  return (
    <div className="space-y-4">
      {/* Connection status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {connectionStatus === 'connected' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-medium text-red-400">LIVE</span>
            </div>
          )}
          {connectionStatus === 'connecting' && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="inline-block h-2 w-2 rounded-full bg-neutral-600 animate-pulse" />
              Connecting to live room...
            </div>
          )}
          {connectionStatus === 'ended' && (
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="inline-block h-2 w-2 rounded-full bg-neutral-600" />
              Debate ended
            </div>
          )}
          {connectionStatus === 'error' && (
            <div className="flex items-center gap-2 text-xs text-yellow-500">
              <span className="inline-block h-2 w-2 rounded-full bg-yellow-600" />
              {errorMsg ?? 'Connection error'}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Audience count */}
          {connectionStatus === 'connected' && (
            <span className="text-xs text-neutral-500">
              {audienceCount} watching
            </span>
          )}

          {/* Mute toggle */}
          <button
            onClick={() => setAudioMuted((m) => !m)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              audioMuted
                ? 'border-red-800/50 bg-red-950/40 text-red-400 hover:bg-red-950/60'
                : 'border-neutral-700/50 bg-neutral-900/40 text-neutral-300 hover:bg-neutral-800'
            }`}
            title={audioMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {audioMuted ? (
              <span className="flex items-center gap-1">
                <MutedIcon />
                Muted
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <UnmutedIcon />
                Audio On
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Speaker stage */}
      <SpeakerStage
        participants={participants}
        activeSpeakerId={activeSpeakerId}
        currentPhase={currentPhase}
      />

      {/* Live transcript */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Live Transcript
        </h2>
        <LiveTranscript turns={turns} activeSpeakerId={activeSpeakerId} />
      </div>
    </div>
  )
}

function MutedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function UnmutedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}
