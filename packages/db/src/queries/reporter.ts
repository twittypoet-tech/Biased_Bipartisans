import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReporterCall, ReportCategory } from '@bipi/shared'

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
    // 'hot' and 'top' — order by upvotes desc, then recency
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

export async function upvoteReporterCall(
  db: SupabaseClient,
  callId: string,
): Promise<void> {
  const { error } = await db.rpc('increment_reporter_upvotes', { call_id: callId })
  if (error) {
    // Fallback: manual increment if rpc not available
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
