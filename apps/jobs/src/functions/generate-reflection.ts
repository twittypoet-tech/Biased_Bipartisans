import type { SupabaseClient } from '@supabase/supabase-js'
import { getDebateTurns, getDebateVotes, getDebateParticipants, getEvalRunsForDebate } from '@bipi/db'
import { insertReflection } from '@bipi/db'
import type { DebateTurn, AgentEvalRun, UUID } from '@bipi/shared'

/**
 * Generate structured post-debate reflections for each agent.
 * Reflections capture what went well, what went poorly, rival lessons,
 * and drift signals for the anti-convergence system.
 */
export async function generateReflections(db: SupabaseClient, debateId: UUID, agentIds: string[]): Promise<void> {
  const [turns, votes, participants, evalRuns] = await Promise.all([
    getDebateTurns(db, debateId),
    getDebateVotes(db, debateId),
    getDebateParticipants(db, debateId),
    getEvalRunsForDebate(db, debateId),
  ])

  // Build agent name lookup
  const agentNames: Record<string, string> = {}
  for (const p of participants) {
    const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
    if (agent) {
      agentNames[p.agent_id] = agent.name as string
    }
  }

  for (const agentId of agentIds) {
    const agentTurns = turns.filter((t) => t.speaker_id === agentId && t.speaker_type === 'agent')
    const evalRun = evalRuns.find((e) => e.agent_id === agentId)

    const reflection = buildReflection(agentId, agentTurns, turns, votes, evalRun, agentNames, agentIds)

    await insertReflection(db, {
      agent_id: agentId,
      debate_id: debateId,
      ...reflection,
    })
  }
}

interface ReflectionData {
  what_went_well: string[]
  what_went_poorly: string[]
  rival_lessons: Record<string, string>
  topic_lessons: string[]
  try_next_time: string[]
  stop_doing: string[]
  drift_signal: string | null
}

function buildReflection(
  agentId: string,
  agentTurns: DebateTurn[],
  allTurns: DebateTurn[],
  votes: Array<{ target_agent_id: string | null; vote_type: string }>,
  evalRun: AgentEvalRun | undefined,
  agentNames: Record<string, string>,
  allAgentIds: string[],
): ReflectionData {
  const whatWentWell: string[] = []
  const whatWentPoorly: string[] = []
  const rivalLessons: Record<string, string> = {}
  const topicLessons: string[] = []
  const tryNextTime: string[] = []
  const stopDoing: string[] = []

  // Analyze eval scores
  if (evalRun) {
    if ((evalRun.epistemic_discipline_score ?? 0) >= 0.7) {
      whatWentWell.push('Strong epistemic discipline — claims were well-labeled')
    } else if ((evalRun.epistemic_discipline_score ?? 0) < 0.4) {
      whatWentPoorly.push('Weak epistemic discipline — too many unlabeled or narrative-tier claims')
      tryNextTime.push('Label claim tiers more explicitly')
    }

    if ((evalRun.persuasion_quality_score ?? 0) >= 0.7) {
      whatWentWell.push('High persuasion quality — audience responded well')
    } else if ((evalRun.persuasion_quality_score ?? 0) < 0.4) {
      whatWentPoorly.push('Low audience reception — arguments didn\'t land')
      tryNextTime.push('Ground arguments in more concrete examples')
    }

    if ((evalRun.distinctiveness_score ?? 0) < 0.4) {
      whatWentPoorly.push('Language too similar to other agents — distinctiveness at risk')
      stopDoing.push('Using generic phrasing that overlaps with other debaters')
    }

    if ((evalRun.participation_balance_score ?? 0) < 0.4) {
      whatWentPoorly.push('Participation imbalance — either dominated or was too quiet')
    }
  }

  // Analyze votes
  const strongVotes = votes.filter((v) => v.target_agent_id === agentId && v.vote_type === 'strongest_argument').length
  const evasiveVotes = votes.filter((v) => v.target_agent_id === agentId && v.vote_type === 'most_evasive').length
  const concessionVotes = votes.filter((v) => v.target_agent_id === agentId && v.vote_type === 'best_concession').length

  if (strongVotes >= 3) whatWentWell.push(`Received ${strongVotes} strongest-argument votes`)
  if (evasiveVotes >= 2) {
    whatWentPoorly.push(`Flagged as evasive ${evasiveVotes} times`)
    stopDoing.push('Dodging direct questions — address them head-on')
  }
  if (concessionVotes >= 1) whatWentWell.push('Audience recognized intellectual honesty in concessions')

  // Rival lessons — what did other agents do well?
  for (const otherId of allAgentIds) {
    if (otherId === agentId) continue
    const otherName = agentNames[otherId] ?? 'Unknown'
    const otherVotes = votes.filter((v) => v.target_agent_id === otherId && v.vote_type === 'strongest_argument').length

    if (otherVotes > strongVotes) {
      rivalLessons[otherName] = `Outperformed on audience votes (${otherVotes} vs ${strongVotes}). Study their approach.`
    }
  }

  // Topic lessons
  if (agentTurns.length > 0) {
    const usedVerified = agentTurns.some((t) => t.claim_tier === 'verified')
    if (!usedVerified) {
      topicLessons.push('Did not use any verified-tier claims. Research more established facts for this topic.')
    }

    const usedSpeculative = agentTurns.some((t) => t.claim_tier === 'speculative')
    if (usedSpeculative) {
      topicLessons.push('Used speculative claims — ensure they were properly labeled and useful')
    }
  }

  // Drift signal — check if agent's score pattern suggests it's becoming too similar
  let driftSignal: string | null = null
  if (evalRun && (evalRun.distinctiveness_score ?? 0) < 0.35) {
    driftSignal = 'LOW_DISTINCTIVENESS: Agent language is converging with other agents. Reinforce unique voice.'
  }

  // Defaults for empty arrays
  if (whatWentWell.length === 0) whatWentWell.push('Participated in the debate')
  if (tryNextTime.length === 0) tryNextTime.push('Continue refining arguments based on debate experience')

  return {
    what_went_well: whatWentWell,
    what_went_poorly: whatWentPoorly,
    rival_lessons: rivalLessons,
    topic_lessons: topicLessons,
    try_next_time: tryNextTime,
    stop_doing: stopDoing,
    drift_signal: driftSignal,
  }
}
