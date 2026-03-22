/**
 * Public-facing score display components for composite + layer breakdown.
 */

function scoreColor(pct: number): string {
  if (pct >= 70) return 'bg-emerald-600'
  if (pct >= 40) return 'bg-amber-600'
  return 'bg-red-600'
}

function scoreBadgeColor(pct: number): string {
  if (pct >= 70) return 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50'
  if (pct >= 40) return 'bg-amber-900/50 text-amber-400 border-amber-700/50'
  return 'bg-red-900/50 text-red-400 border-red-700/50'
}

// ─── CompositeScoreBadge ──────────────────────────────────────────────────────

interface CompositeScoreBadgeProps {
  score: number | null
  size?: 'sm' | 'md'
}

export function CompositeScoreBadge({ score, size = 'sm' }: CompositeScoreBadgeProps) {
  if (score === null) return null

  const pct = Math.round(score * 100)
  const colors = scoreBadgeColor(pct)
  const sizeClasses = size === 'md'
    ? 'px-2.5 py-1 text-sm font-semibold'
    : 'px-2 py-0.5 text-xs font-medium'

  return (
    <span className={`inline-flex items-center rounded-full border ${colors} ${sizeClasses}`}>
      {pct}%
    </span>
  )
}

// ─── LayerBreakdown ───────────────────────────────────────────────────────────

interface LayerBreakdownProps {
  aiJudgeScore: number | null
  objectiveScore: number | null
  audienceScore: number | null
  compositeScore: number | null
}

export function LayerBreakdown({
  aiJudgeScore,
  objectiveScore,
  audienceScore,
  compositeScore,
}: LayerBreakdownProps) {
  if (compositeScore === null && aiJudgeScore === null && objectiveScore === null && audienceScore === null) {
    return null
  }

  return (
    <div className="space-y-1.5">
      <LayerBar label="AI Judge" weight="45%" value={aiJudgeScore} />
      <LayerBar label="Objective" weight="30%" value={objectiveScore} />
      <LayerBar label="Audience" weight="25%" value={audienceScore} />
    </div>
  )
}

function LayerBar({ label, weight, value }: { label: string; weight: string; value: number | null }) {
  const pct = value !== null ? Math.round(value * 100) : 0
  const color = value === null ? 'bg-neutral-700' : scoreColor(pct)

  return (
    <div>
      <div className="flex justify-between mb-0.5 text-[11px]">
        <span className="text-neutral-500">
          {label} <span className="text-neutral-600">({weight})</span>
        </span>
        <span className="text-neutral-400">{value !== null ? `${pct}%` : '—'}</span>
      </div>
      <div className="h-1 rounded-full bg-neutral-800">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
