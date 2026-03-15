'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MemoryReviewActionsProps {
  memoryId: string
}

export function MemoryReviewActions({ memoryId }: MemoryReviewActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const handleAction = async (action: 'approved' | 'rejected' | 'canon') => {
    setLoading(action)
    try {
      const res = await fetch(`/api/admin/memories/${memoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      })

      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        onClick={() => handleAction('canon')}
        disabled={loading !== null}
        className="rounded-md bg-emerald-900 px-2.5 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-800 disabled:opacity-50"
      >
        {loading === 'canon' ? '...' : 'Canon'}
      </button>
      <button
        onClick={() => handleAction('approved')}
        disabled={loading !== null}
        className="rounded-md bg-blue-900 px-2.5 py-1 text-xs font-medium text-blue-200 transition hover:bg-blue-800 disabled:opacity-50"
      >
        {loading === 'approved' ? '...' : 'Approve'}
      </button>
      <button
        onClick={() => handleAction('rejected')}
        disabled={loading !== null}
        className="rounded-md bg-red-900/60 px-2.5 py-1 text-xs font-medium text-red-300 transition hover:bg-red-900 disabled:opacity-50"
      >
        {loading === 'rejected' ? '...' : 'Reject'}
      </button>
    </div>
  )
}
