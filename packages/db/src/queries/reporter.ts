import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReporterCall, ReportCategory, ReportCommentary, SourceCitation, ContentBlock, Callout } from '@bipi/shared'

export type ReporterCallSort = 'hot' | 'new' | 'top'

export async function listPublishedReporterCalls(
  db: SupabaseClient,
  options: {
    limit?: number
    category?: ReportCategory | null
    sort?: ReporterCallSort
  } = {},
): Promise<ReporterCall[]> {
  const { limit = 30, category, sort = 'new' } = options

  let query = db
    .from('reporter_calls')
    .select('*')
    .eq('is_published', true)
    .in('wire_status', ['auto', 'approved'])

  if (category) {
    query = query.eq('report_category', category)
  }

  if (sort === 'new') {
    query = query.order('created_at', { ascending: false })
  } else {
    query = query.order('upvotes', { ascending: false }).order('created_at', { ascending: false })
  }

  const { data, error } = await query.limit(limit)
  if (error) throw error
  return (data ?? []) as ReporterCall[]
}

export interface InsertReporterCallData {
  retell_call_id: string
  call_summary?: string | null
  call_successful?: boolean | null
  user_sentiment?: string | null
  report_headline?: string | null
  report_category?: string | null
  source_count?: number | null
  key_entities?: string | null
  sources_mentioned?: string | null
  report_delivered?: boolean | null
  sources_cited?: boolean | null
  report_quality?: string | null
  publish_to_bipi?: boolean | null
  recording_url?: string | null
  call_language?: string
  user_query?: string | null
  duration_seconds?: number | null
  user_id?: string | null
  wire_status?: string
  is_published?: boolean
  slug?: string
  transcript?: string | null
  report_image_url?: string | null
  sources_json?: SourceCitation[] | null
  body?: ContentBlock[] | null
  callouts?: Callout[] | null
}

export async function insertReporterCall(
  db: SupabaseClient,
  data: InsertReporterCallData,
): Promise<ReporterCall> {
  const { data: row, error } = await db
    .from('reporter_calls')
    .upsert(data, { onConflict: 'retell_call_id' })
    .select()
    .single()
  if (error) throw error
  return row as ReporterCall
}

export async function getReporterCallBySlug(
  db: SupabaseClient,
  slug: string,
  viewerUserId?: string | null,
): Promise<ReporterCall | null> {
  // First try: published + on wire
  const { data, error } = await db
    .from('reporter_calls')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  if (data) return data as ReporterCall

  // Fallback: let the owner view their own report even if not on wire
  if (viewerUserId) {
    const { data: ownData, error: ownError } = await db
      .from('reporter_calls')
      .select('*')
      .eq('slug', slug)
      .eq('user_id', viewerUserId)
      .single()
    if (ownError && ownError.code !== 'PGRST116') throw ownError
    if (ownData) return ownData as ReporterCall
  }

  return null
}

export async function listUserReporterCalls(
  db: SupabaseClient,
  userId: string,
): Promise<ReporterCall[]> {
  const { data, error } = await db
    .from('reporter_calls')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ReporterCall[]
}

export async function requestWirePublish(
  db: SupabaseClient,
  callId: string,
  userId: string,
  targetStatus: 'pending' | 'auto' = 'pending',
): Promise<void> {
  const { error } = await db
    .from('reporter_calls')
    .update({ wire_status: targetStatus })
    .eq('id', callId)
    .eq('user_id', userId)
    .eq('wire_status', 'none')
  if (error) throw error
}

export async function listReportCommentary(
  db: SupabaseClient,
  reportCallId: string,
): Promise<ReportCommentary[]> {
  const { data, error } = await db
    .from('report_commentary')
    .select('*, agents(name, slug, avatar_url, archetype)')
    .eq('report_call_id', reportCallId)
    .eq('is_published', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => {
    const agent = r.agents
    return {
      ...r,
      agents: undefined,
      agent_name: agent?.name,
      agent_slug: agent?.slug,
      agent_avatar_url: agent?.avatar_url,
      agent_archetype: agent?.archetype,
    }
  })
}

// ── Slug generation ──────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export async function generateUniqueReportSlug(
  db: SupabaseClient,
  headline: string,
): Promise<string> {
  const base = slugify(headline) || 'report'
  const { data } = await db
    .from('reporter_calls')
    .select('slug')
    .ilike('slug', `${base}%`)
  const existing = new Set((data ?? []).map((r: { slug: string }) => r.slug))
  if (!existing.has(base)) return base
  let counter = 2
  while (existing.has(`${base}-${counter}`)) counter++
  return `${base}-${counter}`
}

// ── Voting ───────────────────────────────────────────────────────────────────

export async function upvoteReporterCall(
  db: SupabaseClient,
  callId: string,
): Promise<void> {
  const { error } = await db.rpc('increment_reporter_upvotes', { call_id: callId })
  if (error) {
    const { data: row } = await db
      .from('reporter_calls')
      .select('upvotes')
      .eq('id', callId)
      .single()
    if (row) {
      await db
        .from('reporter_calls')
        .update({ upvotes: (row.upvotes ?? 0) + 1 })
        .eq('id', callId)
    }
  }
}

export async function downvoteReporterCall(
  db: SupabaseClient,
  callId: string,
): Promise<void> {
  const { data: row } = await db
    .from('reporter_calls')
    .select('downvotes')
    .eq('id', callId)
    .single()
  if (row) {
    await db
      .from('reporter_calls')
      .update({ downvotes: (row.downvotes ?? 0) + 1 })
      .eq('id', callId)
  }
}

// ── All Commentary Feed ─────────────────────────────────────────────────────

export async function listAllCommentary(
  db: SupabaseClient,
  limit = 30,
): Promise<(ReportCommentary & { report_headline?: string; report_slug?: string; report_category?: string })[]> {
  const { data, error } = await db
    .from('report_commentary')
    .select('*, agents(name, slug, avatar_url, archetype), reporter_calls!report_commentary_report_call_id_fkey(report_headline, slug, report_category)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => {
    const agent = r.agents
    const report = r.reporter_calls
    return {
      ...r,
      agents: undefined,
      reporter_calls: undefined,
      agent_name: agent?.name,
      agent_slug: agent?.slug,
      agent_avatar_url: agent?.avatar_url,
      agent_archetype: agent?.archetype,
      report_headline: report?.report_headline ?? null,
      report_slug: report?.slug ?? null,
      report_category: report?.report_category ?? null,
    }
  })
}

// ── Reporter Aggregate Votes ─────────────────────────────────────────────────

export async function getReporterAggregateVotes(
  db: SupabaseClient,
): Promise<{ upvotes: number; downvotes: number }> {
  const { data, error } = await db
    .from('reporter_calls')
    .select('upvotes, downvotes')
    .eq('is_published', true)
  if (error) throw error
  return (data ?? []).reduce(
    (acc, r) => ({ upvotes: acc.upvotes + (r.upvotes ?? 0), downvotes: acc.downvotes + (r.downvotes ?? 0) }),
    { upvotes: 0, downvotes: 0 },
  )
}

// ── Agent Commentary List ────────────────────────────────────────────────────

export async function listAgentReportCommentary(
  db: SupabaseClient,
  agentId: string,
  limit = 20,
): Promise<(ReportCommentary & { report_headline?: string; report_slug?: string; report_category?: string })[]> {
  const { data, error } = await db
    .from('report_commentary')
    .select('*, reporter_calls!report_commentary_report_call_id_fkey(report_headline, slug, report_category)')
    .eq('agent_id', agentId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => {
    const report = r.reporter_calls
    return {
      ...r,
      reporter_calls: undefined,
      report_headline: report?.report_headline ?? null,
      report_slug: report?.slug ?? null,
      report_category: report?.report_category ?? null,
    }
  })
}

// ── Agent Vote Aggregates ────────────────────────────────────────────────────

export async function getAgentCommentaryVotes(
  db: SupabaseClient,
  agentId: string,
): Promise<{ upvotes: number; downvotes: number }> {
  const { data, error } = await db
    .from('report_commentary')
    .select('upvotes, downvotes')
    .eq('agent_id', agentId)
    .eq('is_published', true)
  if (error) throw error
  const totals = (data ?? []).reduce(
    (acc, r) => ({ upvotes: acc.upvotes + (r.upvotes ?? 0), downvotes: acc.downvotes + (r.downvotes ?? 0) }),
    { upvotes: 0, downvotes: 0 },
  )
  return totals
}

// ── Commentary Voting ───────────────────────────────────────────────────────

export async function upvoteCommentary(
  db: SupabaseClient,
  commentaryId: string,
): Promise<void> {
  const { data: row } = await db
    .from('report_commentary')
    .select('upvotes')
    .eq('id', commentaryId)
    .single()
  if (row) {
    await db
      .from('report_commentary')
      .update({ upvotes: (row.upvotes ?? 0) + 1 })
      .eq('id', commentaryId)
  }
}

export async function downvoteCommentary(
  db: SupabaseClient,
  commentaryId: string,
): Promise<void> {
  const { data: row } = await db
    .from('report_commentary')
    .select('downvotes')
    .eq('id', commentaryId)
    .single()
  if (row) {
    await db
      .from('report_commentary')
      .update({ downvotes: (row.downvotes ?? 0) + 1 })
      .eq('id', commentaryId)
  }
}

// ── Related Reports ─────────────────────────────────────────────────────────

const STOP_WORDS = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'were', 'they', 'this', 'that', 'with', 'from', 'what', 'about', 'which', 'when', 'will', 'more', 'into', 'them', 'than', 'its', 'who', 'how', 'news', 'report'])

export async function getRelatedReports(
  db: SupabaseClient,
  currentId: string,
  keyEntities: string | null,
  userQuery: string | null,
  category: string | null,
  limit = 5,
): Promise<ReporterCall[]> {
  const { data, error } = await db
    .from('reporter_calls')
    .select('*')
    .eq('is_published', true)
    .in('wire_status', ['auto', 'approved'])
    .neq('id', currentId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  if (!data?.length) return []

  // Parse current report's entities and query words
  const currentEntities = (keyEntities ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  const currentWords = (userQuery ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))

  // Score each candidate
  const scored = (data as ReporterCall[]).map((r) => {
    let score = 0

    // Entity overlap (+10 per match)
    if (currentEntities.length > 0 && r.key_entities) {
      const candidateEntities = r.key_entities.toLowerCase()
      for (const entity of currentEntities) {
        if (candidateEntities.includes(entity)) score += 10
      }
    }

    // Query word overlap (+3 per match)
    if (currentWords.length > 0 && r.user_query) {
      const candidateQuery = r.user_query.toLowerCase()
      for (const word of currentWords) {
        if (candidateQuery.includes(word)) score += 3
      }
    }

    // Same category (+1)
    if (category && r.report_category === category) score += 1

    return { report: r, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.report)
}
