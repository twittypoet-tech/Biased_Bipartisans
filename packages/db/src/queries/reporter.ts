import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReporterCall, ReportCategory, ReportCommentary, SourceCitation } from '@bipi/shared'

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
  is_published?: boolean
  slug?: string
  transcript?: string | null
  report_image_url?: string | null
  sources_json?: SourceCitation[] | null
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
): Promise<ReporterCall | null> {
  const { data, error } = await db
    .from('reporter_calls')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return (data as ReporterCall) ?? null
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
