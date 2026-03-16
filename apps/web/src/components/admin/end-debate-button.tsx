'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface EndDebateButtonProps {
  debateId: string
}

export function EndDebateButton({ debateId }: EndDebateButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleEnd = async () => {
    if (!confirm('Force-end this debate? All active Retell calls will be terminated.')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/debates/${debateId}/end`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? 'Failed to end debate')
      } else {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleEnd}
      disabled={loading}
      className="rounded-lg border border-red-800/60 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950/70 disabled:opacity-50"
    >
      {loading ? 'Ending…' : 'Force End Debate'}
    </button>
  )
}
