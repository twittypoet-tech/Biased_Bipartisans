'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Question {
  id: string
  content: string
  upvotes: number
  addressed: boolean
  created_at: string
}

interface AudienceQAProps {
  debateId: string
  isLive: boolean
}

export function AudienceQA({ debateId, isLive }: AudienceQAProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [submitError, setSubmitError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/audience-questions?debateId=${debateId}`)
      if (!res.ok) return
      const data: Question[] = await res.json()
      setQuestions(data)
    } catch {
      // ignore fetch errors
    }
  }, [debateId])

  // Poll for new questions every 5s while debate is live
  useEffect(() => {
    fetchQuestions()
    if (!isLive) return
    pollRef.current = setInterval(fetchQuestions, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchQuestions, isLive])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/audience-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debateId, content: trimmed }),
      })

      if (!res.ok) {
        const err = await res.json()
        setSubmitError(err.error ?? 'Failed to submit')
        return
      }

      const newQuestion: Question = await res.json()
      setQuestions((prev) => [newQuestion, ...prev])
      setInput('')
    } catch {
      setSubmitError('Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpvote = async (id: string) => {
    if (votedIds.has(id)) return

    setVotedIds((prev) => new Set([...prev, id]))
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, upvotes: q.upvotes + 1 } : q)),
    )

    try {
      await fetch('/api/audience-questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: id }),
      })
    } catch {
      // Optimistic update stays — don't revert
    }
  }

  const pending = questions.filter((q) => !q.addressed)
  const addressed = questions.filter((q) => q.addressed)

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
        Audience Questions
      </h2>

      {/* Submission form — only during live debate */}
      {isLive && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the debaters something..."
              maxLength={280}
              className="flex-1 rounded-lg border border-neutral-700/50 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500/30"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || input.trim().length < 5}
              className="rounded-lg border border-neutral-700/50 bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700 disabled:opacity-40"
            >
              {submitting ? '...' : 'Ask'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            {submitError && (
              <p className="text-xs text-red-400">{submitError}</p>
            )}
            <p className="ml-auto text-xs text-neutral-600">
              {input.length}/280
            </p>
          </div>
        </form>
      )}

      {/* Pending questions */}
      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              voted={votedIds.has(q.id)}
              onUpvote={() => handleUpvote(q.id)}
            />
          ))}
        </div>
      )}

      {/* Addressed questions */}
      {addressed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-600">Addressed</p>
          {addressed.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              voted={votedIds.has(q.id)}
              onUpvote={() => handleUpvote(q.id)}
              dimmed
            />
          ))}
        </div>
      )}

      {questions.length === 0 && (
        <p className="text-sm text-neutral-600">
          {isLive ? 'Be the first to ask something.' : 'No audience questions.'}
        </p>
      )}
    </div>
  )
}

function QuestionCard({
  question,
  voted,
  onUpvote,
  dimmed = false,
}: {
  question: Question
  voted: boolean
  onUpvote: () => void
  dimmed?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-neutral-800/50 bg-neutral-900/40 px-3 py-2.5 transition ${dimmed ? 'opacity-50' : ''}`}
    >
      {/* Upvote */}
      <button
        onClick={onUpvote}
        disabled={voted || question.addressed}
        className={`flex min-w-[2.5rem] flex-col items-center gap-0.5 rounded-md px-1.5 py-1 text-xs font-medium transition ${
          voted
            ? 'text-blue-400'
            : 'text-neutral-500 hover:text-neutral-300'
        } disabled:cursor-default`}
        title={voted ? 'Voted' : 'Upvote this question'}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill={voted ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <span>{question.upvotes}</span>
      </button>

      {/* Content */}
      <p className="flex-1 text-sm leading-snug text-neutral-300">
        {question.content}
      </p>

      {/* Addressed badge */}
      {question.addressed && (
        <span className="shrink-0 self-center rounded-full border border-green-800/40 bg-green-950/30 px-2 py-0.5 text-xs text-green-400">
          addressed
        </span>
      )}
    </div>
  )
}
