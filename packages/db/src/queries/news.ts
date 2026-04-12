import type { SupabaseClient } from '@supabase/supabase-js'
import type { UUID } from '@bipi/shared'
import type { NewsReport, ReportImage, AgentCommentary, CommentaryRequest } from '@bipi/shared'

export async function listPublishedReports(
  db: SupabaseClient,
  limit = 20,
): Promise<NewsReport[]> {
  const { data, error } = await db
    .from('news_reports')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as NewsReport[]
}

export async function getFeaturedReport(db: SupabaseClient): Promise<NewsReport | null> {
  const { data, error } = await db
    .from('news_reports')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data as NewsReport | null
}

export interface NewsReportWithAuthor extends NewsReport {
  author_agent?: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    archetype: string
    retell_call_agent_id: string | null
  } | null
}

export async function getReportBySlug(
  db: SupabaseClient,
  slug: string,
): Promise<NewsReportWithAuthor | null> {
  const { data, error } = await db
    .from('news_reports')
    .select('*, agents(id, name, slug, avatar_url, archetype, retell_call_agent_id)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null
  const row = data as Record<string, unknown>
  const agent = row.agents as Record<string, unknown> | null
  const report = { ...row } as Record<string, unknown>
  delete report.agents
  return {
    ...report as unknown as NewsReport,
    author_agent: agent ? {
      id: agent.id as string,
      name: agent.name as string,
      slug: agent.slug as string,
      avatar_url: agent.avatar_url as string | null,
      archetype: agent.archetype as string,
      retell_call_agent_id: agent.retell_call_agent_id as string | null,
    } : null,
  }
}

export async function listReportImages(
  db: SupabaseClient,
  reportId: UUID,
): Promise<ReportImage[]> {
  const { data, error } = await db
    .from('report_images')
    .select('*')
    .eq('report_id', reportId)
    .order('display_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as ReportImage[]
}

export async function listAgentCommentary(
  db: SupabaseClient,
  reportId: UUID,
): Promise<AgentCommentary[]> {
  const { data, error } = await db
    .from('agent_commentary')
    .select('*, agents(name, slug, avatar_url, archetype)')
    .eq('report_id', reportId)
    .eq('is_published', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>
    const agent = r.agents as Record<string, unknown> | null
    return {
      id:               r.id as string,
      report_id:        r.report_id as string,
      agent_id:         r.agent_id as string,
      audio_url:        r.audio_url as string | null,
      transcript:       r.transcript as string | null,
      duration_seconds: r.duration_seconds as number | null,
      is_published:     r.is_published as boolean,
      created_at:       r.created_at as string,
      agent_name:       (agent?.name as string) ?? undefined,
      agent_slug:       (agent?.slug as string) ?? undefined,
      agent_avatar_url: (agent?.avatar_url as string | null) ?? null,
      agent_archetype:  (agent?.archetype as string) ?? undefined,
    } satisfies AgentCommentary
  })
}

export async function listAllAgentsForCommentary(
  db: SupabaseClient,
): Promise<{ id: UUID; name: string; slug: string; archetype: string; expertise: string[]; avatar_url: string | null }[]> {
  const { data, error } = await db
    .from('agents')
    .select('id, name, slug, archetype, expertise, avatar_url')
    .neq('role', 'moderator')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []) as { id: UUID; name: string; slug: string; archetype: string; expertise: string[]; avatar_url: string | null }[]
}

export async function createCommentaryRequest(
  db: SupabaseClient,
  {
    reportId,
    agentId,
    sessionId,
  }: { reportId: UUID; agentId: UUID; sessionId: string },
): Promise<CommentaryRequest> {
  const { data, error } = await db
    .from('commentary_requests')
    .insert({ report_id: reportId, agent_id: agentId, requester_session_id: sessionId })
    .select()
    .single()
  if (error) throw error
  return data as CommentaryRequest
}

// ── News report commentary, grouped by article for the /commentary feed ──────

export interface NewsReportCommentaryGroup {
  report: {
    id: UUID
    slug: string
    headline: string
    summary: string | null
    category: string | null
    hero_image_url: string | null
    published_at: string | null
    author_agent: {
      name: string
      slug: string
      avatar_url: string | null
      archetype: string
    } | null
  }
  commentaries: AgentCommentary[]
  latest_commentary_at: string
}

/**
 * Lists news-report commentary grouped by article. Articles are ordered by
 * their most recent commentary timestamp (most active first). Used by the
 * redesigned /commentary feed.
 */
export async function listNewsReportCommentaryGrouped(
  db: SupabaseClient,
  limit = 20,
): Promise<NewsReportCommentaryGroup[]> {
  // 1. Pull all published commentaries (newest first) with joined agent data
  //    and the parent news_report row + its author agent.
  const { data, error } = await db
    .from('agent_commentary')
    .select(`
      id, report_id, agent_id, audio_url, transcript, duration_seconds, is_published, created_at,
      agents:agents!agent_commentary_agent_id_fkey(name, slug, avatar_url, archetype),
      news_reports!inner(
        id, slug, headline, summary, category, hero_image_url, published_at, is_published,
        author:agents!news_reports_agent_id_fkey(name, slug, avatar_url, archetype)
      )
    `)
    .eq('is_published', true)
    .eq('news_reports.is_published', true)
    .order('created_at', { ascending: false })
    .limit(400)

  if (error) throw error

  // 2. Group by news_report_id, preserving the first (newest) timestamp seen.
  const groups = new Map<string, NewsReportCommentaryGroup>()

  for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
    const reportRaw = row.news_reports as Record<string, unknown> | null
    if (!reportRaw) continue

    const reportId = reportRaw.id as string
    const agentRaw = row.agents as Record<string, unknown> | null
    const authorRaw = reportRaw.author as Record<string, unknown> | null

    const commentary: AgentCommentary = {
      id:               row.id as string,
      report_id:        row.report_id as string,
      agent_id:         row.agent_id as string,
      audio_url:        row.audio_url as string | null,
      transcript:       row.transcript as string | null,
      duration_seconds: row.duration_seconds as number | null,
      is_published:     row.is_published as boolean,
      created_at:       row.created_at as string,
      agent_name:       (agentRaw?.name as string) ?? undefined,
      agent_slug:       (agentRaw?.slug as string) ?? undefined,
      agent_avatar_url: (agentRaw?.avatar_url as string | null) ?? null,
      agent_archetype:  (agentRaw?.archetype as string) ?? undefined,
    }

    const existing = groups.get(reportId)
    if (existing) {
      existing.commentaries.push(commentary)
    } else {
      groups.set(reportId, {
        report: {
          id:             reportId,
          slug:           reportRaw.slug as string,
          headline:       reportRaw.headline as string,
          summary:        (reportRaw.summary as string | null) ?? null,
          category:       (reportRaw.category as string | null) ?? null,
          hero_image_url: (reportRaw.hero_image_url as string | null) ?? null,
          published_at:   (reportRaw.published_at as string | null) ?? null,
          author_agent: authorRaw
            ? {
                name:       authorRaw.name as string,
                slug:       authorRaw.slug as string,
                avatar_url: (authorRaw.avatar_url as string | null) ?? null,
                archetype:  authorRaw.archetype as string,
              }
            : null,
        },
        commentaries: [commentary],
        latest_commentary_at: commentary.created_at,
      })
    }
  }

  // 3. Sort each group's commentaries oldest-to-newest so the reader UX plays
  //    them in chronological order when autoplaying a thread.
  const result = Array.from(groups.values()).map((g) => ({
    ...g,
    commentaries: [...g.commentaries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  }))

  // 4. Sort groups by most recent commentary activity, then cap.
  result.sort(
    (a, b) =>
      new Date(b.latest_commentary_at).getTime() -
      new Date(a.latest_commentary_at).getTime(),
  )

  return result.slice(0, limit)
}

export async function listReportsByAgent(
  db: SupabaseClient,
  agentId: UUID,
  limit = 20,
): Promise<NewsReport[]> {
  const { data, error } = await db
    .from('news_reports')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as NewsReport[]
}

export interface RelatedPerspective {
  id: string
  slug: string
  headline: string
  agent_name: string
  agent_slug: string
  agent_avatar_url: string | null
  agent_archetype: string
}

export async function listPublishedReportsByCategory(
  db: SupabaseClient,
  category: string,
  limit = 30,
): Promise<NewsReport[]> {
  const { data, error } = await db
    .from('news_reports')
    .select('*')
    .eq('category', category)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as NewsReport[]
}

export async function listRecentBreakingReports(
  db: SupabaseClient,
  withinMinutes = 60,
): Promise<NewsReport[]> {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString()
  const { data, error } = await db
    .from('news_reports')
    .select('*')
    .eq('is_published', true)
    .gte('published_at', cutoff)
    .order('published_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as NewsReport[]
}

export async function listTrendingReports(
  db: SupabaseClient,
  limit = 5,
): Promise<NewsReport[]> {
  const { data, error } = await db
    .from('news_reports')
    .select('*')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as NewsReport[]
}

export async function getRelatedNewsReports(
  db: SupabaseClient,
  currentId: UUID,
  keyEntities: string | null,
  category: string | null,
  limit = 5,
): Promise<NewsReport[]> {
  const { data, error } = await db
    .from('news_reports')
    .select('*')
    .eq('is_published', true)
    .neq('id', currentId)
    .order('published_at', { ascending: false })
    .limit(50)
  if (error) throw error
  if (!data?.length) return []

  const currentEntities = (keyEntities ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  const scored = data.map((r) => {
    const row = r as Record<string, unknown>
    const entities = ((row.key_entities as string) ?? '')
      .split(',')
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean)

    let score = 0
    for (const e of currentEntities) {
      if (entities.some((re: string) => re.includes(e) || e.includes(re))) score += 3
    }
    if (category && (row.category as string) === category) score += 1
    return { report: r as NewsReport, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.report)
}

export async function listRelatedPerspectives(
  db: SupabaseClient,
  storyGroupId: string,
  excludeReportId: UUID,
): Promise<RelatedPerspective[]> {
  const { data, error } = await db
    .from('news_reports')
    .select('id, slug, headline, agents(name, slug, avatar_url, archetype)')
    .eq('story_group_id', storyGroupId)
    .eq('is_published', true)
    .neq('id', excludeReportId)
    .order('published_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as Record<string, unknown>
    const agent = r.agents as Record<string, unknown> | null
    return {
      id: r.id as string,
      slug: r.slug as string,
      headline: r.headline as string,
      agent_name: (agent?.name as string) ?? 'Unknown',
      agent_slug: (agent?.slug as string) ?? '',
      agent_avatar_url: (agent?.avatar_url as string | null) ?? null,
      agent_archetype: (agent?.archetype as string) ?? '',
    }
  })
}
