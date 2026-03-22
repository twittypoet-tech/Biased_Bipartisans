'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RunAiJudgesButtonProps {
  debateId: string
  hasScores: boolean
}

export function RunAiJudgesButton({ debateId, hasScores }: RunAiJudgesButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setDone(false)
    try {
      const res = await fetch(`/api/admin/debates/${debateId}/run-ai-judges`, { method: 'POST' })
      const data = await res.json() as { ok?: boolean; error?: string }
      if (res.ok) {
        setDone(true)
        router.refresh()
      } else {
        setError(data.error ?? 'Unknown error')
      }
    } catch {
      setError('Network error — check server logs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleRun}
        disabled={loading}
        className="rounded-lg border border-violet-800/50 bg-violet-950/30 px-3 py-1.5 text-xs font-medium text-violet-300 transition hover:bg-violet-950/60 disabled:opacity-50"
      >
        {loading ? 'Judging… (~30s)' : hasScores ? 'Re-run AI Judges' : 'Run AI Judges'}
      </button>
      {done && <span className="text-xs text-emerald-400">Scores updated</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
