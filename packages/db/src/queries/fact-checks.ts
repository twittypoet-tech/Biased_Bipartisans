import type { SupabaseClient } from '@supabase/supabase-js'

export interface FactCheck {
  id: string
  debate_id: string
  query: string
  answer: string | null
  sources: Array<{ title: string; url: string; content: string; score: number }>
  triggered_by_agent_id: string | null
  triggered_by_turn_id: string | null
  created_at: string
}

export async function insertFactCheck(
  db: SupabaseClient,
  record: {
    debate_id: string
    query: string
    answer: string | null
    sources: FactCheck['sources']
    triggered_by_agent_id?: string | null
    triggered_by_turn_id?: string | null
  },
): Promise<FactCheck> {
  const { data, error } = await db.from('debate_fact_checks').insert(record).select().single()
  if (error) throw error
  return data
}

export async function getDebateFactChecks(
  db: SupabaseClient,
  debateId: string,
  limit = 20,
): Promise<FactCheck[]> {
  const { data, error } = await db
    .from('debate_fact_checks')
    .select('*')
    .eq('debate_id', debateId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as FactCheck[]
}

export async function getRecentFactChecks(
  db: SupabaseClient,
  debateId: string,
  limit = 3,
): Promise<FactCheck[]> {
  const { data, error } = await db
    .from('debate_fact_checks')
    .select('*')
    .eq('debate_id', debateId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return ((data ?? []) as FactCheck[]).reverse()  // chronological for context injection
}
