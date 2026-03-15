import type { SupabaseClient } from '@supabase/supabase-js'

export interface AudienceMessage {
  id: string
  debate_id: string
  session_id: string
  content: string
  upvotes: number
  addressed: boolean
  addressed_in_turn_id: string | null
  created_at: string
}

export async function insertAudienceMessage(
  db: SupabaseClient,
  message: { debate_id: string; session_id: string; content: string },
): Promise<AudienceMessage> {
  const { data, error } = await db.from('audience_messages').insert(message).select().single()
  if (error) throw error
  return data
}

export async function getTopAudienceQuestions(
  db: SupabaseClient,
  debateId: string,
  limit = 3,
): Promise<AudienceMessage[]> {
  const { data, error } = await db
    .from('audience_messages')
    .select('*')
    .eq('debate_id', debateId)
    .eq('addressed', false)
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getAudienceMessages(
  db: SupabaseClient,
  debateId: string,
): Promise<AudienceMessage[]> {
  const { data, error } = await db
    .from('audience_messages')
    .select('*')
    .eq('debate_id', debateId)
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function markQuestionAddressed(
  db: SupabaseClient,
  messageId: string,
  turnId: string,
): Promise<void> {
  const { error } = await db
    .from('audience_messages')
    .update({ addressed: true, addressed_in_turn_id: turnId })
    .eq('id', messageId)
  if (error) throw error
}

export async function upvoteAudienceMessage(
  db: SupabaseClient,
  messageId: string,
  sessionId: string,
): Promise<{ upvotes: number }> {
  // Insert the upvote record (PK prevents duplicates)
  const { error: voteError } = await db
    .from('audience_message_upvotes')
    .insert({ message_id: messageId, session_id: sessionId })

  if (voteError) {
    // Duplicate key = already voted
    if (voteError.code === '23505') return { upvotes: -1 }
    throw voteError
  }

  // Increment the denormalized count
  const { data, error } = await db
    .rpc('increment_audience_upvotes', { message_id: messageId })
    .select('upvotes')
    .single()

  // RPC may not exist yet — fall back to a read-then-update
  if (error) {
    const { data: msg, error: readError } = await db
      .from('audience_messages')
      .select('upvotes')
      .eq('id', messageId)
      .single()
    if (readError) throw readError

    const newCount = (msg.upvotes ?? 0) + 1
    await db.from('audience_messages').update({ upvotes: newCount }).eq('id', messageId)
    return { upvotes: newCount }
  }

  return { upvotes: data?.upvotes ?? 0 }
}
