'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getArchetypeColor } from '@/lib/agent-colors'

interface AgentInfo {
  id: string
  name: string
  slug: string
  archetype: string
  role: string
}

interface Props {
  debateId: string
  debateStatus: string
  formatMinParticipants: number
  formatMaxParticipants: number
  currentParticipants: AgentInfo[]
  availableAgents: AgentInfo[]
  moderatorId: string | null
}

export function ParticipantManager({
  debateId,
  debateStatus,
  formatMinParticipants,
  formatMaxParticipants,
  currentParticipants,
  availableAgents,
  moderatorId,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const debaters = currentParticipants.filter((p) => p.role === 'debater')
  const hasModerator = currentParticipants.some((p) => p.role === 'moderator')
  const canStart = debaters.length >= formatMinParticipants && hasModerator
  const canAddMore = debaters.length < formatMaxParticipants
  const isEditable = debateStatus === 'draft' || debateStatus === 'scheduled'

  async function addParticipant(agentId: string, role: string) {
    setLoading(agentId)
    try {
      await fetch(`/api/admin/debates/${debateId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, role }),
      })

      // If adding the first debater and no moderator, auto-add moderator
      if (role === 'debater' && !hasModerator && moderatorId) {
        await fetch(`/api/admin/debates/${debateId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: moderatorId, role: 'moderator' }),
        })
      }

      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function removeParticipant(agentId: string) {
    setLoading(agentId)
    try {
      await fetch(`/api/admin/debates/${debateId}/participants?agentId=${agentId}`, {
        method: 'DELETE',
      })
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function quickFill() {
    setLoading('quickfill')
    try {
      // Add all available debaters up to max
      const debaterAgents = availableAgents.filter((a) => a.role === 'debater')
      const toAdd = debaterAgents.slice(0, formatMaxParticipants - debaters.length)

      for (const agent of toAdd) {
        await fetch(`/api/admin/debates/${debateId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: agent.id, role: 'debater' }),
        })
      }

      // Add moderator if not present
      if (!hasModerator && moderatorId) {
        await fetch(`/api/admin/debates/${debateId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: moderatorId, role: 'moderator' }),
        })
      }

      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function startNow() {
    if (!confirm('Start this debate now? Agents will begin debating immediately.')) return
    setStarting(true)
    try {
      const res = await fetch(`/api/admin/debates/${debateId}/start`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        // Page will auto-refresh via ScheduledDebatePoller once status → live
        router.refresh()
      } else {
        alert(`Failed to start debate:\n\n${data.error || res.statusText}`)
      }
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Participants */}
      {currentParticipants.length > 0 && (
        <div className="space-y-2">
          {currentParticipants.map((p) => {
            const colors = getArchetypeColor(p.archetype)
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-lg border ${colors.border} p-3`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${colors.badge}`}>
                    {p.archetype.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-neutral-500">{p.role}</span>
                </div>
                {isEditable && (
                  <button
                    onClick={() => removeParticipant(p.id)}
                    disabled={loading === p.id}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Participants */}
      {isEditable && canAddMore && availableAgents.filter((a) => a.role === 'debater').length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-neutral-500">Add Agents</h4>
            {availableAgents.filter((a) => a.role === 'debater').length > 1 && (
              <button
                onClick={quickFill}
                disabled={loading === 'quickfill'}
                className="rounded bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700 disabled:opacity-50"
              >
                Quick Fill
              </button>
            )}
          </div>
          {availableAgents
            .filter((a) => a.role === 'debater')
            .map((agent) => {
              const colors = getArchetypeColor(agent.archetype)
              return (
                <button
                  key={agent.id}
                  onClick={() => addParticipant(agent.id, 'debater')}
                  disabled={loading === agent.id}
                  className={`flex w-full items-center justify-between rounded-lg border border-neutral-800 p-3 text-left transition hover:border-neutral-600 disabled:opacity-50`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{agent.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${colors.badge}`}>
                      {agent.archetype.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">+ Add</span>
                </button>
              )
            })}
        </div>
      )}

      {/* Status + Start Now */}
      {isEditable && (
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
          <div className="text-xs text-neutral-500">
            {debaters.length}/{formatMinParticipants} debaters
            {hasModerator ? ' + moderator' : ' (no moderator)'}
          </div>
          <button
            onClick={startNow}
            disabled={!canStart || starting}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500"
          >
            {starting ? 'Starting...' : 'Start Now'}
          </button>
        </div>
      )}
    </div>
  )
}
