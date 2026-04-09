export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { SearchInput } from './search-input'
import { SearchResults } from './search-results'

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

interface ScoredResult {
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

  let results: ScoredResult[] = []

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
        <SearchResults results={results} query={query} />
      </div>
    </div>
  )
}
