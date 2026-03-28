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

export async function getReportBySlug(
  db: SupabaseClient,
  slug: string,
): Promise<NewsReport | null> {
  const { data, error } = await db
    .from('news_reports')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data as NewsReport | null
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
