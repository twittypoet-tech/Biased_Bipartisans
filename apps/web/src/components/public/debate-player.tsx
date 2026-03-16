'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SpeakerStage, type StageParticipant } from './speaker-stage'
import { DebateTimer } from './debate-timer'
import { getArchetypeColor } from '@/lib/agent-colors'

export interface PlaybackTurn {
  id: string
  speakerName: string
  speakerId: string
  archetype: string
  roundPhase: string
  turnIndex: number
  transcript: string
  isModerator: boolean
  audioUrl: string | null
  claimTier: string | null
  startedAt?: string | null   // wall-clock start (migration 008) — used to seek recording
}

interface DebatePlayerProps {
  turns: PlaybackTurn[]
  participants: StageParticipant[]
  startedAt: string
  endedAt: string
  estimatedDurationSec: number
  /** Single debate recording URL (from Retell call recordings). Optional. */
  recordingUrl?: string | null
}

const phaseLabels: Record<string, string> = {
  opening: 'Opening Statements',
  discussion: 'Discussion',
  rebuttal: 'Rebuttals',
  pressure: 'Pressure Round',
  audience_evidence: 'Audience & Evidence',
  closing: 'Closing Arguments',
}

export function DebatePlayer({
  turns,
  participants,
  startedAt,
  endedAt,
  estimatedDurationSec,
  recordingUrl,
}: DebatePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0)
  const [audioProgress, setAudioProgress] = useState(0)
  const [hasAudio, setHasAudio] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)

  // Use refs for values that callbacks need without stale closures
  const isPlayingRef = useRef(false)
  const currentTurnIdxRef = useRef(0)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentTurn = turns[currentTurnIdx] ?? null

  useEffect(() => {
    setHasAudio(!!recordingUrl || turns.some((t) => t.audioUrl))
  }, [turns, recordingUrl])

  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useEffect(() => {
    currentTurnIdxRef.current = currentTurnIdx
  }, [currentTurnIdx])

  // Auto-scroll transcript to current turn
  useEffect(() => {
    const el = document.getElementById(`playback-turn-${currentTurnIdx}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentTurnIdx])

  // Cleanup advance timer on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  const playTurn = useCallback((idx: number) => {
    // Clear any pending advance timer
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }

    if (idx >= turns.length) {
      setIsPlaying(false)
      isPlayingRef.current = false
      setCurrentTurnIdx(0)
      currentTurnIdxRef.current = 0
      setAudioProgress(0)
      return
    }

    const turn = turns[idx]!
    setCurrentTurnIdx(idx)
    currentTurnIdxRef.current = idx
    setAudioProgress(0)

    if (turn.audioUrl && audioRef.current) {
      // Per-turn audio (legacy TTS model)
      audioRef.current.src = turn.audioUrl
      audioRef.current.play().catch(() => scheduleAdvance(idx, turn.transcript.length))
    } else if (recordingUrl && audioRef.current) {
      // Single debate recording — seek to turn's position using started_at timestamp
      if (turn.startedAt && startedAt) {
        const offsetSec = (new Date(turn.startedAt).getTime() - new Date(startedAt).getTime()) / 1000
        if (audioRef.current.src !== recordingUrl) {
          audioRef.current.src = recordingUrl
        }
        audioRef.current.currentTime = Math.max(0, offsetSec)
        audioRef.current.play().catch(() => scheduleAdvance(idx, turn.transcript.length))
      } else {
        // No timestamp info — play from beginning or advance
        if (audioRef.current.paused) {
          audioRef.current.play().catch(() => scheduleAdvance(idx, turn.transcript.length))
        } else {
          scheduleAdvance(idx, turn.transcript.length)
        }
      }
    } else {
      // No audio — auto-advance after a reading delay
      scheduleAdvance(idx, turn.transcript.length)
    }
  }, [turns])

  /** Schedule auto-advance to next turn for text-only turns */
  const scheduleAdvance = useCallback((idx: number, textLength: number) => {
    const readingTimeMs = Math.max(2000, textLength * 30)
    advanceTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current) {
        playTurn(idx + 1)
      }
    }, readingTimeMs)
  }, [playTurn])

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false)
      isPlayingRef.current = false
      audioRef.current?.pause()
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current)
        advanceTimerRef.current = null
      }
    } else {
      setIsPlaying(true)
      isPlayingRef.current = true
      // Pre-load the debate recording when first pressing play
      if (recordingUrl && audioRef.current && !audioRef.current.src) {
        audioRef.current.src = recordingUrl
      }
      playTurn(currentTurnIdxRef.current)
    }
  }

  const handleAudioEnded = () => {
    if (isPlayingRef.current) {
      playTurn(currentTurnIdxRef.current + 1)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      setAudioProgress(audioRef.current.currentTime / audioRef.current.duration)
    }
  }

  const skipTo = (idx: number) => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
    setCurrentTurnIdx(idx)
    currentTurnIdxRef.current = idx
    setAudioProgress(0)
    if (isPlayingRef.current) {
      playTurn(idx)
    }
  }

  const skipPrev = () => skipTo(Math.max(0, currentTurnIdx - 1))
  const skipNext = () => skipTo(Math.min(turns.length - 1, currentTurnIdx + 1))

  const overallProgress = turns.length > 0 ? (currentTurnIdx + audioProgress) / turns.length : 0

  return (
    <div className="space-y-4">
      {/* Audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onTimeUpdate={handleTimeUpdate}
        preload="auto"
      />

      {/* Player controls */}
      <div className="rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900/80 to-neutral-950/90 p-4">
        {/* Timer bar */}
        <div className="mb-4 flex items-center justify-between">
          <DebateTimer
            startedAt={startedAt}
            endedAt={endedAt}
            estimatedDurationSec={estimatedDurationSec}
            mode="static"
          />
          <span className="text-xs text-neutral-600">
            Turn {currentTurnIdx + 1} / {turns.length}
          </span>
        </div>

        {/* Overall progress bar */}
        <div
          className="mb-4 h-1.5 w-full cursor-pointer rounded-full bg-neutral-800"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pct = (e.clientX - rect.left) / rect.width
            const targetIdx = Math.floor(pct * turns.length)
            skipTo(Math.max(0, Math.min(turns.length - 1, targetIdx)))
          }}
        >
          <div
            className="h-full rounded-full bg-white/80 transition-all duration-300"
            style={{ width: `${overallProgress * 100}%` }}
          />
          {/* Turn markers */}
          <div className="relative -mt-1.5">
            {turns.map((turn, i) => {
              const left = (i / turns.length) * 100
              const isCurrent = i === currentTurnIdx
              const colors = turn.isModerator ? null : getArchetypeColor(turn.archetype)
              return (
                <div
                  key={turn.id}
                  className={`absolute top-0 h-1.5 w-0.5 ${
                    isCurrent ? 'bg-white' : colors ? '' : 'bg-neutral-700'
                  }`}
                  style={{
                    left: `${left}%`,
                    backgroundColor: !isCurrent && colors ? getSpeakerColor(turn.archetype) : undefined,
                    opacity: isCurrent ? 1 : 0.4,
                  }}
                  title={`${turn.speakerName} — ${phaseLabels[turn.roundPhase] ?? turn.roundPhase}`}
                />
              )
            })}
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={skipPrev}
            disabled={currentTurnIdx === 0}
            className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Previous turn"
          >
            <SkipBackIcon />
          </button>

          <button
            onClick={togglePlayback}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-900 transition hover:bg-neutral-200"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            onClick={skipNext}
            disabled={currentTurnIdx >= turns.length - 1}
            className="rounded-full p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            title="Next turn"
          >
            <SkipForwardIcon />
          </button>
        </div>

        {/* No audio notice */}
        {!hasAudio && (
          <p className="mt-3 text-center text-xs text-neutral-600">
            No audio recorded for this debate. Showing transcript only.
          </p>
        )}
      </div>

      {/* Speaker stage — driven by current turn */}
      <SpeakerStage
        participants={participants}
        activeSpeakerId={isPlaying ? currentTurn?.speakerId ?? null : null}
        currentPhase={currentTurn?.roundPhase ?? null}
      />

      {/* Transcript with highlighted current turn */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Transcript
        </h2>
        <div className="debate-transcript space-y-1 overflow-y-auto max-h-[60vh] pr-1 scroll-smooth">
          {turns.map((turn, i) => {
            const showPhaseHeader = i === 0 || turn.roundPhase !== turns[i - 1]!.roundPhase
            const isCurrent = i === currentTurnIdx && isPlaying
            const isPast = i < currentTurnIdx
            const colors = turn.isModerator
              ? { text: 'text-neutral-300', bg: 'bg-neutral-900/30', border: 'border-neutral-700/40', badge: '' }
              : getArchetypeColor(turn.archetype)

            return (
              <div key={turn.id} id={`playback-turn-${i}`}>
                {showPhaseHeader && (
                  <div className="flex items-center gap-3 py-4">
                    <div className="h-px flex-1 bg-neutral-800" />
                    <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      {phaseLabels[turn.roundPhase] ?? turn.roundPhase}
                    </span>
                    <div className="h-px flex-1 bg-neutral-800" />
                  </div>
                )}
                <button
                  onClick={() => skipTo(i)}
                  className={`w-full text-left rounded-lg border p-4 transition-all duration-300 ${
                    turn.isModerator
                      ? 'border-neutral-700/40 bg-neutral-900/30'
                      : `${colors.border} ${colors.bg}`
                  } ${isCurrent ? 'ring-2 ring-white/20 scale-[1.01]' : ''} ${
                    isPast && !isCurrent ? 'opacity-50' : ''
                  } hover:brightness-110`}
                >
                  <div className="flex items-center gap-2">
                    {turn.audioUrl ? (
                      <span className={`inline-block h-2 w-2 rounded-full ${isCurrent ? 'bg-green-400 animate-pulse' : 'bg-neutral-600'}`} />
                    ) : (
                      <span className="inline-block h-2 w-2 rounded-full bg-neutral-800" title="No audio" />
                    )}
                    <span className={`text-sm font-semibold ${turn.isModerator ? 'text-neutral-300' : colors.text}`}>
                      {turn.isModerator ? 'Moderator' : turn.speakerName}
                    </span>
                    {!turn.isModerator && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}>
                        {turn.archetype.replace('_', ' ')}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="ml-auto rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] font-medium text-green-400">
                        Playing
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {turn.transcript}
                  </p>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getSpeakerColor(archetype: string): string {
  const colors: Record<string, string> = {
    hawk: '#f87171',
    dove: '#38bdf8',
    technocrat: '#a78bfa',
    populist: '#fbbf24',
    cynic: '#a1a1aa',
    conspiracy_theorist: '#34d399',
    institutionalist: '#60a5fa',
    libertarian: '#fb923c',
  }
  return colors[archetype] ?? '#71717a'
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  )
}

function SkipBackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  )
}

function SkipForwardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  )
}
