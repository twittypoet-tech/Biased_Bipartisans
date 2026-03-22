'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RunPipelineButtonProps {
  debateId: string
}

export function RunPipelineButton({ debateId }: RunPipelineButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setDone(false)
    try {
      const res = await fetch(`/api/admin/debates/${debateId}/run-pipeline`, { method: 'POST' })
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
        className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-950/60 disabled:opacity-50"
      >
        {loading ? 'Running… (~45s)' : 'Run Evaluation Pipeline'}
      </button>
      {done && <span className="text-xs text-emerald-400">Pipeline complete — scores ready</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}
