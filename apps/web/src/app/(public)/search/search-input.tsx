'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function SearchInput({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-t-text-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search news, reports, agents, topics..."
          autoFocus
          className="w-full rounded-xl border border-t-edge bg-t-bg pl-12 pr-4 py-3.5 text-base text-t-text placeholder:text-t-text-4 focus:outline-none focus:border-t-edge-strong focus:ring-1 focus:ring-t-edge-strong transition"
        />
      </div>
    </form>
  )
}
