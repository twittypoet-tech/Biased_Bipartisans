'use client'

import { useState } from 'react'
import { getArchetypeColor } from '@/lib/agent-colors'

interface VotingAgent {
  id: string
  name: string
  archetype: string
}

interface VotingPanelProps {
  debateId: string
  agents: VotingAgent[]
  currentPhase: string | null
  isLive: boolean
}

const voteCategories = [
  { type: 'strongest_argument', label: 'Strongest Argument', description: 'Who made the best case?' },
  { type: 'best_evidence', label: 'Best Evidence', description: 'Who backed their claims best?' },
  { type: 'most_evasive', label: 'Most Evasive', description: 'Who dodged the hardest questions?' },
  { type: 'best_rebuttal', label: 'Best Rebuttal', description: 'Who had the sharpest counter?' },
  { type: 'best_concession', label: 'Best Concession', description: 'Who showed intellectual honesty?' },
]

export function VotingPanel({ debateId, agents, currentPhase, isLive }: VotingPanelProps) {
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState<string | null>(null)

  const debaters = agents.filter((a) => a.archetype !== 'moderator')

  const handleVote = (voteType: string, agentId: string) => {
    if (submitted.has(voteType)) return
    setSelectedVotes((prev) => ({ ...prev, [voteType]: agentId }))
  }

  const submitVote = async (voteType: string) => {
    const agentId = selectedVotes[voteType]
    if (!agentId || submitted.has(voteType)) return

    setSubmitting(voteType)
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debateId,
          voteType,
          targetAgentId: agentId,
          roundPhase: currentPhase,
        }),
      })

      if (res.ok) {
        setSubmitted((prev) => new Set(prev).add(voteType))
      }
    } finally {
      setSubmitting(null)
    }
  }

  if (!isLive && debaters.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
        Cast Your Votes
      </h3>
      {voteCategories.map((cat) => {
        const isSubmitted = submitted.has(cat.type)
        const selectedAgent = selectedVotes[cat.type]

        return (
          <div key={cat.type} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
            <div className="mb-2">
              <span className="text-sm font-medium text-neutral-200">{cat.label}</span>
              <p className="text-xs text-neutral-500">{cat.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {debaters.map((agent) => {
                const colors = getArchetypeColor(agent.archetype)
                const isSelected = selectedAgent === agent.id

                return (
                  <button
                    key={agent.id}
                    onClick={() => handleVote(cat.type, agent.id)}
                    disabled={isSubmitted}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? `${colors.badge} ring-2 ring-white/20`
                        : isSubmitted
                          ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                          : `bg-neutral-800 ${colors.text} hover:${colors.bg}`
                    }`}
                  >
                    {agent.name}
                  </button>
                )
              })}
            </div>
            {selectedAgent && !isSubmitted && (
              <button
                onClick={() => submitVote(cat.type)}
                disabled={submitting === cat.type}
                className="mt-2 rounded-md bg-white px-3 py-1 text-xs font-medium text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50"
              >
                {submitting === cat.type ? 'Submitting...' : 'Submit'}
              </button>
            )}
            {isSubmitted && (
              <p className="mt-2 text-xs text-emerald-500">Vote recorded</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
