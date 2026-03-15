'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface FactCheck {
  id: string
  query: string
  answer: string | null
  sources: Array<{ title: string; url: string; content: string; score: number }>
  triggered_by_agent_id: string | null
  created_at: string
}

interface FactCheckFeedProps {
  debateId: string
  isLive: boolean
}

export function FactCheckFeed({ debateId, isLive }: FactCheckFeedProps) {
  const [factChecks, setFactChecks] = useState<FactCheck[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenIds = useRef<Set<string>>(new Set())

  const fetchFactChecks = useCallback(async () => {
    try {
      const res = await fetch(`/api/fact-checks?debateId=${debateId}`)
      if (!res.ok) return
      const data: FactCheck[] = await res.json()
      setFactChecks(data)
      data.forEach((fc) => seenIds.current.add(fc.id))
    } catch {
      // ignore
    }
  }, [debateId])

  useEffect(() => {
    fetchFactChecks()
    if (!isLive) return
    pollRef.current = setInterval(fetchFactChecks, 8000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchFactChecks, isLive])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (factChecks.length === 0) {
    return (
      <div className="space-y-3">
        <OracleHeader />
        <p className="text-sm text-neutral-600">
          {isLive ? 'Oracle is scanning the debate for claims to verify...' : 'No fact-checks recorded.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <OracleHeader />
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-0.5">
        {factChecks.map((fc) => (
          <FactCheckCard
            key={fc.id}
            factCheck={fc}
            isExpanded={expanded.has(fc.id)}
            onToggle={() => toggleExpand(fc.id)}
          />
        ))}
      </div>
    </div>
  )
}

function OracleHeader() {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
      Oracle Feed
    </h2>
  )
}

function FactCheckCard({
  factCheck,
  isExpanded,
  onToggle,
}: {
  factCheck: FactCheck
  isExpanded: boolean
  onToggle: () => void
}) {
  const topSource = factCheck.sources[0]
  const hasDetail = !!factCheck.answer || factCheck.sources.length > 0

  return (
    <div className="rounded-lg border border-blue-900/30 bg-blue-950/20 px-3 py-2.5 text-xs">
      {/* Query */}
      <button
        className="w-full text-left"
        onClick={hasDetail ? onToggle : undefined}
        disabled={!hasDetail}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-blue-300 leading-snug flex-1">{factCheck.query}</span>
          {hasDetail && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`mt-0.5 shrink-0 text-blue-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </button>

      {/* Answer — always visible if short */}
      {factCheck.answer && !isExpanded && (
        <p className="mt-1 text-neutral-400 line-clamp-2 leading-snug">
          {factCheck.answer}
        </p>
      )}

      {/* Expanded detail */}
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {factCheck.answer && (
            <p className="text-neutral-300 leading-relaxed">{factCheck.answer}</p>
          )}
          {factCheck.sources.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-blue-900/30">
              <p className="text-neutral-600 text-[10px] uppercase tracking-wide">Sources</p>
              {factCheck.sources.slice(0, 3).map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-500 hover:text-blue-400 transition line-clamp-1"
                >
                  {src.title || src.url}
                </a>
              ))}
            </div>
          )}
          {topSource && (
            <p className="text-neutral-500 leading-snug line-clamp-3">
              {topSource.content}
            </p>
          )}
        </div>
      )}

      {/* Timestamp */}
      <p className="mt-1.5 text-neutral-700">
        {new Date(factCheck.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
