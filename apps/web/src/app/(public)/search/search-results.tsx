'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { CATEGORY_COLORS, formatAge, FALLBACK_IMAGE_URL } from '@/lib/categories'

export interface SearchResult {
  type: 'report' | 'call'
  slug: string
  headline: string
  summary: string | null
  category: string | null
  imageUrl: string | null
  publishedAt: string
}

export function SearchResults({ results, query }: { results: SearchResult[]; query: string }) {
  if (!query) {
    return (
      <div className="py-20 text-center">
        <Search className="size-10 mx-auto mb-4 text-t-text-4" />
        <p className="text-lg text-t-text-2">Search news, reports, agents, and topics</p>
        <p className="text-sm text-t-text-3 mt-1">Results ranked by key entities, headline, summary, and author</p>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-t-text-2 mb-2">No results found for &ldquo;{query}&rdquo;</p>
        <p className="text-sm text-t-text-3">Try different keywords or check the spelling</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((r) => {
        const href = r.type === 'report' ? `/news/${r.slug}` : `/reports/${r.slug}`
        const dateStr = new Date(r.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

        return (
          <Link key={`${r.type}-${r.slug}`} href={href} className="block group">
            <article className="flex gap-4 sm:gap-5 rounded-xl border border-t-edge bg-t-surface p-4 transition hover:border-t-edge-strong hover:bg-t-hover">
              {/* Thumbnail */}
              <div className="shrink-0 w-24 h-24 sm:w-36 sm:h-28 rounded-lg overflow-hidden bg-t-surface-el">
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.imageUrl}
                    alt={r.headline}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-t-text-4">
                    <Search className="size-6" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1.5">
                  {r.category && (
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[r.category] ?? 'bg-t-surface-el text-t-text-3 border-t-edge'}`}>
                      {r.category}
                    </span>
                  )}
                  <time dateTime={r.publishedAt} className="text-[11px] text-t-text-4">
                    {dateStr} ({formatAge(r.publishedAt)})
                  </time>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-t-text leading-snug mb-1 group-hover:text-t-accent-text transition line-clamp-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {r.headline}
                </h2>
                {r.summary && (
                  <p className="text-xs sm:text-sm text-t-text-2 leading-relaxed line-clamp-2">
                    {r.summary}
                  </p>
                )}
              </div>
            </article>
          </Link>
        )
      })}
    </div>
  )
}
