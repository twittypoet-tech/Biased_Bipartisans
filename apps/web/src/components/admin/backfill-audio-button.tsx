'use client'

import { useState } from 'react'

interface BackfillAudioButtonProps {
  debateId: string
  turnsWithoutAudio: number
  totalTurns: number
}

export function BackfillAudioButton({ debateId, turnsWithoutAudio, totalTurns }: BackfillAudioButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ generated: number; failed: number; voiceMode: string } | null>(null)

  if (turnsWithoutAudio === 0 && !result) {
    return (
      <p className="text-xs text-green-500">All {totalTurns} turns have audio</p>
    )
  }

  const handleBackfill = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/debates/${debateId}/backfill-audio`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.ok) {
        setResult({ generated: data.generated, failed: data.failed, voiceMode: data.voiceMode })
      } else {
        setResult({ generated: 0, failed: turnsWithoutAudio, voiceMode: 'error' })
      }
    } catch {
      setResult({ generated: 0, failed: turnsWithoutAudio, voiceMode: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBackfill}
          disabled={loading}
          className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-950/50 disabled:opacity-50"
        >
          {loading ? 'Generating audio...' : `Generate audio for ${turnsWithoutAudio} turns`}
        </button>
        <span className="text-xs text-neutral-500">
          {totalTurns - turnsWithoutAudio}/{totalTurns} turns have audio
        </span>
      </div>
      {result && (
        <p className={`text-xs ${result.failed > 0 ? 'text-amber-400' : 'text-green-400'}`}>
          Generated {result.generated} audio files
          {result.failed > 0 && `, ${result.failed} failed`}
          {result.voiceMode === 'error' && ' — check server logs'}
        </p>
      )}
    </div>
  )
}
