'use client'

import { getArchetypeColor } from '@/lib/agent-colors'

interface TranscriptTurn {
  id: string
  speakerType: string
  speakerName: string
  archetype: string
  roundPhase: string
  turnIndex: number
  transcript: string
  claimTier: string | null
}

interface TranscriptTimelineProps {
  turns: TranscriptTurn[]
}

const claimTierLabels: Record<string, { label: string; color: string }> = {
  verified: { label: 'Verified', color: 'bg-emerald-900 text-emerald-200' },
  plausible_inference: { label: 'Plausible', color: 'bg-blue-900 text-blue-200' },
  speculative: { label: 'Speculative', color: 'bg-amber-900 text-amber-200' },
  narrative_rhetoric: { label: 'Narrative', color: 'bg-purple-900 text-purple-200' },
}

const phaseLabels: Record<string, string> = {
  opening: 'Opening Statements',
  rebuttal: 'Rebuttals',
  pressure: 'Pressure Round',
  audience_evidence: 'Audience & Evidence',
  closing: 'Closing Arguments',
}

export function TranscriptTimeline({ turns }: TranscriptTimelineProps) {
  if (turns.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-8 text-center text-neutral-500">
        No turns yet. The debate hasn&apos;t started.
      </div>
    )
  }

  let currentPhase = ''

  return (
    <div className="space-y-1">
      {turns.map((turn) => {
        const showPhaseHeader = turn.roundPhase !== currentPhase
        if (showPhaseHeader) currentPhase = turn.roundPhase

        const isModerator = turn.speakerType === 'moderator'
        const colors = isModerator
          ? { text: 'text-neutral-300', bg: 'bg-neutral-900/30', border: 'border-neutral-700/40' }
          : getArchetypeColor(turn.archetype)

        const tierInfo = turn.claimTier ? claimTierLabels[turn.claimTier] : null

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
            <div className={`rounded-lg border p-4 ${isModerator ? 'border-neutral-700/40 bg-neutral-900/30' : `${colors.border} ${colors.bg}`}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${isModerator ? 'text-neutral-300' : colors.text}`}>
                  {isModerator ? 'Moderator' : turn.speakerName}
                </span>
                {!isModerator && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getArchetypeColor(turn.archetype).badge}`}>
                    {turn.archetype.replace('_', ' ')}
                  </span>
                )}
                {tierInfo && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tierInfo.color}`}>
                    {tierInfo.label}
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
    </div>
  )
}
