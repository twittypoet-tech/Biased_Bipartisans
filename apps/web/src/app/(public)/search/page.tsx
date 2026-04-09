export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { SearchInput } from './search-input'
import { CATEGORY_COLORS, formatAge, FALLBACK_IMAGE_URL } from '@/lib/categories'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `"${q}" — Search Results` : 'Search',
    robots: { index: false, follow: true },
  }
}

interface SearchResult {
  type: 'report' | 'call'
  slug: string
  headline: string
  summary: string | null
  category: string | null
  imageUrl: string | null
  publishedAt: string
  relevance: number
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  let results: SearchResult[] = []

  if (query) {
    const db = createServerClient()
    const pattern = `%${query}%`

    // Search news_reports
    const { data: reports } = await db
      .from('news_reports')
      .select('slug, headline, subheadline, summary, category, hero_image_url, published_at, key_entities, agent_id')
      .eq('is_published', true)
      .or(`key_entities.ilike."${pattern}",headline.ilike."${pattern}",summary.ilike."${pattern}"`)
      .order('published_at', { ascending: false })
      .limit(50)

    // Search reporter_calls
    const { data: calls } = await db
      .from('reporter_calls')
      .select('slug, report_headline, call_summary, report_category, report_image_url, created_at, key_entities')
      .eq('is_published', true)
      .or(`key_entities.ilike."${pattern}",report_headline.ilike."${pattern}",call_summary.ilike."${pattern}"`)
      .order('created_at', { ascending: false })
      .limit(50)

    // Also search by agent name — find agents matching the query, then fetch their reports
    const { data: matchingAgents } = await db
      .from('agents')
      .select('id, name')
      .ilike('name', pattern)

    const agentIds = (matchingAgents ?? []).map(a => a.id)
    let agentReports: typeof reports = []
    if (agentIds.length > 0) {
      const { data } = await db
        .from('news_reports')
        .select('slug, headline, subheadline, summary, category, hero_image_url, published_at, key_entities, agent_id')
        .eq('is_published', true)
        .in('agent_id', agentIds)
        .order('published_at', { ascending: false })
        .limit(30)
      agentReports = data
    }

    // Build agent name lookup for scoring
    const allAgentIds = [...new Set([...(reports ?? []), ...(agentReports ?? [])].map(r => r.agent_id).filter(Boolean))]
    const agentNameMap = new Map<string, string>()
    if (allAgentIds.length > 0) {
      const { data: agents } = await db.from('agents').select('id, name').in('id', allAgentIds)
      for (const a of agents ?? []) agentNameMap.set(a.id, a.name)
    }
    // Also add the matching agents we already fetched
    for (const a of matchingAgents ?? []) agentNameMap.set(a.id, a.name)

    // Score and deduplicate results
    const lowerQuery = query.toLowerCase()
    const seen = new Set<string>()

    function scoreReport(r: { key_entities?: string | null; headline: string; summary?: string | null; agentName?: string | null }): number {
      let score = 0
      if (r.key_entities?.toLowerCase().includes(lowerQuery)) score += 40
      if (r.headline.toLowerCase().includes(lowerQuery)) score += 30
      if (r.summary?.toLowerCase().includes(lowerQuery)) score += 20
      if (r.agentName?.toLowerCase().includes(lowerQuery)) score += 10
      return score
    }

    for (const r of reports ?? []) {
      const key = `report-${r.slug}`
      if (seen.has(key)) continue
      seen.add(key)
      const agentName = r.agent_id ? agentNameMap.get(r.agent_id) ?? null : null
      results.push({
        type: 'report',
        slug: r.slug,
        headline: r.headline,
        summary: r.summary,
        category: r.category,
        imageUrl: r.hero_image_url,
        publishedAt: r.published_at,
        relevance: scoreReport({ key_entities: r.key_entities, headline: r.headline, summary: r.summary, agentName }),
      })
    }

    // Add agent-matched reports not already in results
    for (const r of agentReports ?? []) {
      const key = `report-${r.slug}`
      if (seen.has(key)) continue
      seen.add(key)
      const agentName = r.agent_id ? agentNameMap.get(r.agent_id) ?? null : null
      results.push({
        type: 'report',
        slug: r.slug,
        headline: r.headline,
        summary: r.summary,
        category: r.category,
        imageUrl: r.hero_image_url,
        publishedAt: r.published_at,
        relevance: scoreReport({ key_entities: r.key_entities, headline: r.headline, summary: r.summary, agentName }),
      })
    }

    for (const c of calls ?? []) {
      const key = `call-${c.slug}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push({
        type: 'call',
        slug: c.slug,
        headline: c.report_headline ?? 'Untitled Report',
        summary: c.call_summary,
        category: c.report_category,
        imageUrl: c.report_image_url,
        publishedAt: c.created_at,
        relevance: scoreReport({ key_entities: c.key_entities, headline: c.report_headline ?? '', summary: c.call_summary }),
      })
    }

    // Sort by relevance desc, then date desc
    results.sort((a, b) => b.relevance - a.relevance || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
  }

  return (
    <div className="bg-t-bg min-h-screen">
      {/* Search header */}
      <div className="border-b border-t-edge bg-t-surface">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <SearchInput initialQuery={query} />
          {query && (
            <p className="mt-3 text-sm text-t-text-3">
              {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        {!query && (
          <div className="py-20 text-center">
            <Search className="size-10 mx-auto mb-4 text-t-text-4" />
            <p className="text-lg text-t-text-2">Search news, reports, agents, and topics</p>
            <p className="text-sm text-t-text-3 mt-1">Results ranked by key entities, headline, summary, and author</p>
          </div>
        )}

        {query && results.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg text-t-text-2 mb-2">No results found for &ldquo;{query}&rdquo;</p>
            <p className="text-sm text-t-text-3">Try different keywords or check the spelling</p>
          </div>
        )}

        {results.length > 0 && (
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
        )}
      </div>
    </div>
  )
}
