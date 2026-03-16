'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Polls every 3s while a debate is in 'scheduled' state and triggers a
 * router.refresh() the moment the server returns a different status.
 * Once the parent page re-renders as 'live', this component is unmounted.
 */
export function ScheduledDebatePoller({ debateId }: { debateId: string }) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/debates/${debateId}/status`)
        if (!res.ok) return
        const { status } = await res.json()
        if (status !== 'scheduled') {
          router.refresh()
        }
      } catch {
        // ignore network errors — will retry
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [debateId, router])

  return null
}
