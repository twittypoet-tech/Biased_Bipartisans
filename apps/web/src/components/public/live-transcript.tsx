'use client'

import { useEffect, useRef } from 'react'
import { getArchetypeColor } from '@/lib/agent-colors'

export interface LiveTurnEntry {
  id: string
  speakerName: string
  speakerId: string
  archetype: string
  roundPhase: string
  turnIndex: number
  transcript: string
  isModerator: boolean
  isNew?: boolean
}

interface LiveTranscriptProps {
  turns: LiveTurnEntry[]
  activeSpeakerId: string | null
}

const phaseLabels: Record<string, string> = {
  opening: 'Opening Statements',
  rebuttal: 'Rebuttals',
  pressure: 'Pressure Round',
  audience_evidence: 'Audience & Evidence',
  closing: 'Closing Arguments',
}

export function LiveTranscript({ turns, activeSpeakerId }: LiveTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new turns
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns.length])

  if (turns.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900/40">
        <div className="text-center">
          <div className="mb-2 text-2xl opacity-30">🎙️</div>
          <p className="text-sm text-neutral-500">Waiting for the debate to begin...</p>
          <div className="mt-3 flex items-center justify-center gap-1">
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-600" style={{ animationDelay: '0ms' }} />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-600" style={{ animationDelay: '200ms' }} />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-600" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      </div>
    )
  }

  let currentPhase = ''

  return (
    <div className="debate-transcript space-y-1 overflow-y-auto max-h-[60vh] pr-1 scroll-smooth">
      {turns.map((turn) => {
        const showPhaseHeader = turn.roundPhase !== currentPhase
        if (showPhaseHeader) currentPhase = turn.roundPhase

        const isSpeaking = activeSpeakerId === turn.speakerId
        const colors = turn.isModerator
          ? { text: 'text-neutral-300', bg: 'bg-neutral-900/30', border: 'border-neutral-700/40', badge: '' }
          : getArchetypeColor(turn.archetype)

        return (
          <div key={turn.id}>
            {showPhaseHeader && (
              <div className="flex items-center gap-3 py-4">
                <div className="h-px flex-1 bg-neutral-800" />
                <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                  {phaseLabels[turn.roundPhase] ?? turn.roundPhase}
                </span>
                <div className="h-px flex-1 bg-neutral-800" />
              </div>
            )}
            <div
              className={`rounded-lg border p-4 transition-all duration-500 ${
                turn.isModerator
                  ? 'border-neutral-700/40 bg-neutral-900/30'
                  : `${colors.border} ${colors.bg}`
              } ${isSpeaking ? 'ring-1 ring-white/10' : ''} ${
                turn.isNew ? 'animate-slideIn' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Speaker avatar dot */}
                <span
                  className={`inline-block h-2 w-2 rounded-full transition-colors duration-300 ${
                    isSpeaking ? 'bg-green-400 animate-pulse' : turn.isModerator ? 'bg-neutral-600' : getArchetypeDotColor(turn.archetype)
                  }`}
                />
                <span className={`text-sm font-semibold ${turn.isModerator ? 'text-neutral-300' : colors.text}`}>
                  {turn.isModerator ? 'Moderator' : turn.speakerName}
                </span>
                {!turn.isModerator && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors.badge}`}>
                    {turn.archetype.replace('_', ' ')}
                  </span>
                )}
                {isSpeaking && (
                  <span className="ml-auto rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] font-medium text-green-400">
                    Speaking
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {turn.transcript}
              </p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

function getArchetypeDotColor(archetype: string): string {
  const colors: Record<string, string> = {
    hawk: 'bg-red-400',
    dove: 'bg-sky-400',
    technocrat: 'bg-violet-400',
    populist: 'bg-amber-400',
    cynic: 'bg-zinc-400',
    conspiracy_theorist: 'bg-emerald-400',
    institutionalist: 'bg-blue-400',
    libertarian: 'bg-orange-400',
  }
  return colors[archetype] ?? 'bg-neutral-500'
}
