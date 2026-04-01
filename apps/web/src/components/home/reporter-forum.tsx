'use client'

import { useState, useMemo } from 'react'
import type { ReporterCall } from '@bipi/shared'
import { ReporterCallCard } from './reporter-call-card'
import { MakeCallModal } from './make-call-modal'

// Base categories — new ones from post-call analysis are appended dynamically
const BASE_CATEGORIES = [
  'Environmental Science',
  'History & Politics',
  'Law & Jurisprudence',
  'Medicine & Healthcare',
  'Philosophy & Ethics',
  'Rhetoric & Persuasion',
  'Statistics & Data Science',
  'Technology & Innovation',
]

type SortMode = 'hot' | 'new' | 'top'

interface ReporterForumProps {
  initialCalls: ReporterCall[]
}

export function ReporterForum({ initialCalls }: ReporterForumProps) {
  const [calls, setCalls]           = useState<ReporterCall[]>(initialCalls)
  const [showModal, setShowModal]   = useState(false)
  const [search, setSearch]         = useState('')
  const [category, setCategory]     = useState<string>('All')
  const [sort, setSort]             = useState<SortMode>('hot')
  const [userVotes, setUserVotes]   = useState<Record<string, 'up' | 'down' | null>>({})

  // Build category tabs from base list + any new categories found in the data
  const categories = useMemo(() => {
    const dataCategories = new Set(
      calls.map((c) => c.report_category).filter(Boolean) as string[],
    )
    const merged = new Set(BASE_CATEGORIES)
    for (const cat of dataCategories) merged.add(cat)
    return ['All', ...Array.from(merged).sort()]
  }, [calls])

  const filtered = useMemo(() => {
    let result = calls

    if (category !== 'All') {
      result = result.filter((c) => c.report_category === category)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.report_headline?.toLowerCase().includes(q) ||
          c.call_summary?.toLowerCase().includes(q) ||
          c.key_entities?.toLowerCase().includes(q),
      )
    }

    return [...result].sort((a, b) => {
      if (sort === 'new') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sort === 'top') return b.upvotes - a.upvotes
      // hot: net votes descending, recency tiebreak
      const netA = a.upvotes - a.downvotes
      const netB = b.upvotes - b.downvotes
      if (netB !== netA) return netB - netA
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [calls, category, search, sort])

  function handleUpvote(id: string) {
    const prev = userVotes[id] ?? null
    if (prev === 'up') return // already upvoted

    setCalls((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c
        return {
          ...c,
          upvotes:   c.upvotes + 1,
          downvotes: prev === 'down' ? c.downvotes - 1 : c.downvotes,
        }
      }),
    )
    setUserVotes((v) => ({ ...v, [id]: 'up' }))
  }

  function handleDownvote(id: string) {
    const prev = userVotes[id] ?? null
    if (prev === 'down') return

    setCalls((cs) =>
      cs.map((c) => {
        if (c.id !== id) return c
        return {
          ...c,
          downvotes: c.downvotes + 1,
          upvotes:   prev === 'up' ? c.upvotes - 1 : c.upvotes,
        }
      }),
    )
    setUserVotes((v) => ({ ...v, [id]: 'down' }))
  }

  return (
    <section className="w-full max-w-3xl mx-auto px-4 py-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-amber-400" />
          </span>
          <h2 className="text-lg font-bold text-white tracking-tight">The Wire</h2>
          <span className="text-xs text-neutral-600 font-medium">Live reporter feed</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-white text-neutral-900 px-3.5 py-2 text-xs font-semibold hover:bg-neutral-200 active:scale-[0.98] transition"
        >
          <MicIcon />
          Make a Call
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reports…"
          className="w-full rounded-lg bg-neutral-900 border border-neutral-800 pl-9 pr-4 py-2 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600 transition"
        />
      </div>

      {/* ── Category tabs ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition whitespace-nowrap ${
              category === cat
                ? 'bg-neutral-700 text-white'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Sort tabs ── */}
      <div className="flex items-center gap-1 mb-5">
        {(['hot', 'new', 'top'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide transition ${
              sort === s
                ? 'text-amber-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {s === 'hot' ? 'Hot' : s === 'new' ? 'New' : 'Top'}
          </button>
        ))}
      </div>

      {/* ── Feed ── */}
      {filtered.length === 0 ? (
        <EmptyState hasSearch={!!search.trim() || category !== 'All'} onCallClick={() => setShowModal(true)} />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((call) => (
            <ReporterCallCard
              key={call.id}
              call={call}
              onUpvote={handleUpvote}
              onDownvote={handleDownvote}
              userVote={userVotes[call.id] ?? null}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && <MakeCallModal onClose={() => setShowModal(false)} />}
    </section>
  )
}

function EmptyState({ hasSearch, onCallClick }: { hasSearch: boolean; onCallClick: () => void }) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center py-16 gap-3 text-center">
        <p className="text-sm text-neutral-500">No reports match your search.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center py-16 gap-4 text-center">
      <div className="size-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-2xl">
        📡
      </div>
      <div>
        <p className="text-sm font-medium text-white">No reports yet</p>
        <p className="mt-1 text-xs text-neutral-500">Be the first to call The Reporter</p>
      </div>
      <button
        onClick={onCallClick}
        className="flex items-center gap-2 rounded-lg bg-white text-neutral-900 px-4 py-2 text-xs font-semibold hover:bg-neutral-200 transition"
      >
        <MicIcon />
        Make a Call
      </button>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
