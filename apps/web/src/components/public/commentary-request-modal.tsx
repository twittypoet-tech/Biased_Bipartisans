'use client'

import { useState } from 'react'
import { getArchetypeColor } from '@/lib/agent-colors'
import { isProUser } from './pro-upgrade-modal'

interface Agent {
  id: string
  name: string
  slug: string
  archetype: string
  expertise: string[]
  avatar_url: string | null
}

interface CommentaryRequestModalProps {
  reportId: string
  agents: Agent[]
  onClose: () => void
  onNeedsUpgrade: () => void
  onSuccess: () => void
}

export function CommentaryRequestModal({
  reportId,
  agents,
  onClose,
  onNeedsUpgrade,
  onSuccess,
}: CommentaryRequestModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const handleSubmit = async () => {
    if (selected.size === 0) return

    // Pro gate — check before writing to DB
    if (!isProUser()) {
      onClose()
      onNeedsUpgrade()
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const sessionId = getOrCreateSessionId()
      await Promise.all(
        Array.from(selected).map((agentId) =>
          fetch('/api/commentary-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId, agentId, sessionId }),
          }).then((res) => {
            if (!res.ok) throw new Error('Request failed')
          }),
        ),
      )
      onSuccess()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer / Modal */}
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-t-2xl border border-neutral-700 bg-neutral-900 shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white sm:text-lg">Request Commentary</h2>
            <p className="text-xs text-neutral-500">Select one or more agents to weigh in</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition hover:text-neutral-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Agent list */}
        <div className="max-h-[50vh] overflow-y-auto px-5 py-3">
          {agents.map((agent) => {
            const colors = getArchetypeColor(agent.archetype)
            const isChecked = selected.has(agent.id)
            return (
              <label
                key={agent.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition-colors ${isChecked ? `${colors.bg} border border-${colors.border}` : 'hover:bg-neutral-800'}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}
                >
                  {agent.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={agent.avatar_url} alt={agent.name} className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    agent.name.charAt(0)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{agent.name}</p>
                  <p className={`text-xs ${colors.text}`}>{agent.archetype.replace(/_/g, ' ')}</p>
                </div>

                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(agent.id)}
                  className="h-4 w-4 rounded border-neutral-600 accent-amber-400"
                />
              </label>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 px-5 py-4">
          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-neutral-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selected.size === 0 || submitting}
              className="flex-1 rounded-lg bg-white py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting
                ? 'Sending…'
                : `Request ${selected.size > 0 ? `(${selected.size})` : ''}`}
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-neutral-600">
            Pro plan required to submit requests
          </p>
        </div>
      </div>
    </div>
  )
}

function getOrCreateSessionId(): string {
  const key = 'bipi_session_id'
  let id = typeof window !== 'undefined' ? localStorage.getItem(key) : null
  if (!id) {
    id = crypto.randomUUID()
    if (typeof window !== 'undefined') localStorage.setItem(key, id)
  }
  return id
}
