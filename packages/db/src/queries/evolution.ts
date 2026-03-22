import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AgentMemory,
  AgentTraitVector,
  AgentReflection,
  AgentEvalRun,
  AgentEvalJudgeScore,
  AgentEvalObjectiveScore,
  AgentTopicConfidence,
  UUID,
} from '@bipi/shared'

// ─── Memories ───

export async function getAgentMemories(
  db: SupabaseClient,
  agentId: UUID,
  filters?: { status?: string; limit?: number },
): Promise<AgentMemory[]> {
  let query = db
    .from('agent_memories')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.limit) query = query.limit(filters.limit)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getCanonMemories(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentMemory[]> {
  return getAgentMemories(db, agentId, { status: 'canon' })
}

export async function getPendingMemoryCandidates(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentMemory[]> {
  return getAgentMemories(db, agentId, { status: 'candidate' })
}

export async function insertMemoryCandidate(
  db: SupabaseClient,
  memory: Omit<AgentMemory, 'id' | 'created_at' | 'reviewed_at' | 'reviewed_by'>,
): Promise<AgentMemory> {
  const { data, error } = await db
    .from('agent_memories')
    .insert({ ...memory, status: 'candidate' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMemoryStatus(
  db: SupabaseClient,
  memoryId: UUID,
  status: string,
  reviewedBy: string,
): Promise<void> {
  const { error } = await db
    .from('agent_memories')
    .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewedBy })
    .eq('id', memoryId)
  if (error) throw error
}

// ─── Trait Vectors ───

export async function getAgentTraitVectors(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentTraitVector[]> {
  const { data, error } = await db
    .from('agent_trait_vectors')
    .select('*')
    .eq('agent_id', agentId)
  if (error) throw error
  return data ?? []
}

export async function upsertTraitVector(
  db: SupabaseClient,
  agentId: UUID,
  traitName: string,
  value: number,
  updateClass: string,
  debateId?: UUID,
): Promise<void> {
  const { error } = await db.from('agent_trait_vectors').upsert(
    {
      agent_id: agentId,
      trait_name: traitName,
      value,
      update_class: updateClass,
      last_updated_debate_id: debateId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'agent_id,trait_name' },
  )
  if (error) throw error
}

// ─── Reflections ───

export async function getAgentReflections(
  db: SupabaseClient,
  agentId: UUID,
  limit = 10,
): Promise<AgentReflection[]> {
  const { data, error } = await db
    .from('agent_reflections')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function insertReflection(
  db: SupabaseClient,
  reflection: Omit<AgentReflection, 'id' | 'created_at'>,
): Promise<AgentReflection> {
  const { data, error } = await db.from('agent_reflections').insert(reflection).select().single()
  if (error) throw error
  return data
}

// ─── Eval Runs ───

export async function getEvalRunsForDebate(
  db: SupabaseClient,
  debateId: UUID,
): Promise<AgentEvalRun[]> {
  const { data, error } = await db
    .from('agent_eval_runs')
    .select('*')
    .eq('debate_id', debateId)
  if (error) throw error
  return data ?? []
}

export async function getEvalRunsForAgent(
  db: SupabaseClient,
  agentId: UUID,
  limit = 20,
): Promise<AgentEvalRun[]> {
  const { data, error } = await db
    .from('agent_eval_runs')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function insertEvalRun(
  db: SupabaseClient,
  evalRun: Omit<AgentEvalRun, 'id' | 'created_at'>,
): Promise<AgentEvalRun> {
  const { data, error } = await db.from('agent_eval_runs').insert(evalRun).select().single()
  if (error) throw error
  return data
}

// ─── AI Judge Scores ───

export async function insertJudgeScore(
  db: SupabaseClient,
  score: Omit<AgentEvalJudgeScore, 'id' | 'created_at'>,
): Promise<AgentEvalJudgeScore> {
  const { data, error } = await db.from('agent_eval_judge_scores').insert(score).select().single()
  if (error) throw error
  return data
}

export async function getJudgeScoresForEvalRun(
  db: SupabaseClient,
  evalRunId: UUID,
): Promise<AgentEvalJudgeScore[]> {
  const { data, error } = await db
    .from('agent_eval_judge_scores')
    .select('*')
    .eq('eval_run_id', evalRunId)
  if (error) throw error
  return data ?? []
}

export async function updateEvalRunAiJudgeScore(
  db: SupabaseClient,
  evalRunId: UUID,
  aiJudgeScore: number,
): Promise<void> {
  const { error } = await db
    .from('agent_eval_runs')
    .update({ ai_judge_score: aiJudgeScore })
    .eq('id', evalRunId)
  if (error) throw error
}

// ─── Objective Metric Scores (Layer 2) ───

export async function insertObjectiveScore(
  db: SupabaseClient,
  score: Omit<AgentEvalObjectiveScore, 'id' | 'created_at'>,
): Promise<AgentEvalObjectiveScore> {
  const { data, error } = await db.from('agent_eval_objective_scores').insert(score).select().single()
  if (error) throw error
  return data
}

export async function getObjectiveScoresForEvalRun(
  db: SupabaseClient,
  evalRunId: UUID,
): Promise<AgentEvalObjectiveScore[]> {
  const { data, error } = await db
    .from('agent_eval_objective_scores')
    .select('*')
    .eq('eval_run_id', evalRunId)
  if (error) throw error
  return data ?? []
}

export async function updateEvalRunObjectiveScore(
  db: SupabaseClient,
  evalRunId: UUID,
  objectiveScore: number,
): Promise<void> {
  const { error } = await db
    .from('agent_eval_runs')
    .update({ objective_score: objectiveScore })
    .eq('id', evalRunId)
  if (error) throw error
}

// ─── Topic Confidence ───

export async function getAgentTopicConfidence(
  db: SupabaseClient,
  agentId: UUID,
): Promise<AgentTopicConfidence[]> {
  const { data, error } = await db
    .from('agent_topic_confidence')
    .select('*')
    .eq('agent_id', agentId)
    .order('confidence_score', { ascending: false })
  if (error) throw error
  return data ?? []
}
