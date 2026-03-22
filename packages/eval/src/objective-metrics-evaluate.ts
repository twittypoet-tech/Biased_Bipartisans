import type { SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import {
  getDebateTurns,
  getDebateParticipants,
  getEvalRunsForDebate,
  insertObjectiveScore,
  updateEvalRunObjectiveScore,
} from '@bipi/db'
import { createLogger } from '@bipi/shared'
import type { UUID } from '@bipi/shared'

const log = createLogger('eval:objective-metrics')

const EVALUATOR_MODEL = 'claude-3-5-haiku-20241022'

// Lazy singleton
let _anthropic: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

// ─── Zod Schema ───

const ObjectiveScoreSchema = z.object({
  epistemic_discipline: z.number().min(0).max(1),
  distinctiveness: z.number().min(0).max(1),
  factual_accuracy: z.number().min(0).max(1),
  direct_rebuttal: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),
  consistency: z.number().min(0).max(1),
  claim_support: z.number().min(0).max(1),
  reasoning: z.object({
    epistemic_discipline: z.string(),
    distinctiveness: z.string(),
    factual_accuracy: z.string(),
    direct_rebuttal: z.string(),
    relevance: z.string(),
    consistency: z.string(),
    claim_support: z.string(),
  }),
})

type ObjectiveScore = z.infer<typeof ObjectiveScoreSchema>

/**
 * Layer 2 of the 3-layer scoring system: Objective Metrics Evaluation.
 *
 * Uses a single Claude Sonnet call per agent to score 7 objective/verifiable
 * dimensions. Single model is appropriate here — objective checks have lower
 * inter-model variance than subjective quality judgements (Layer 1).
 *
 * Must be called after evaluateDebate() — requires eval runs to exist.
 */
export async function runObjectiveMetricsEvaluation(db: SupabaseClient, debateId: UUID): Promise<void> {
  const [turns, participants, evalRuns] = await Promise.all([
    getDebateTurns(db, debateId),
    getDebateParticipants(db, debateId),
    getEvalRunsForDebate(db, debateId),
  ])

  const debaterParticipants = participants.filter((p) => p.role === 'debater')
  if (debaterParticipants.length === 0) {
    log.warn(`No debaters found for debate ${debateId}, skipping objective metrics evaluation`)
    return
  }

  const fullTranscript = buildTranscript(turns, participants)

  // Build list of all debater names for the distinctiveness dimension
  const allDebaterNames = debaterParticipants.map(
    (p) => (p as unknown as { agents?: { name?: string } }).agents?.name ?? p.agent_id.slice(0, 8),
  )

  for (const participant of debaterParticipants) {
    const agentId = participant.agent_id
    const evalRun = evalRuns.find((r) => r.agent_id === agentId)
    if (!evalRun) {
      log.warn(`No eval run found for agent ${agentId} in debate ${debateId}, skipping`)
      continue
    }

    const agentName = (participant as unknown as { agents?: { name?: string } }).agents?.name ?? agentId
    const otherDebaterNames = allDebaterNames.filter((n) => n !== agentName)
    const agentTurns = turns.filter((t) => t.speaker_id === agentId && t.speaker_type === 'agent')

    log.info(`Running objective metrics evaluation for agent ${agentName}`)

    try {
      const score = await runEvaluator(
        fullTranscript,
        agentName,
        agentTurns.map((t) => t.transcript),
        otherDebaterNames,
      )

      const overall = computeOverall(score)

      await insertObjectiveScore(db, {
        debate_id: debateId,
        agent_id: agentId,
        eval_run_id: evalRun.id,
        evaluator_model: EVALUATOR_MODEL,
        epistemic_discipline: score.epistemic_discipline,
        distinctiveness: score.distinctiveness,
        factual_accuracy: score.factual_accuracy,
        direct_rebuttal: score.direct_rebuttal,
        relevance: score.relevance,
        consistency: score.consistency,
        claim_support: score.claim_support,
        overall_score: overall,
        reasoning: score.reasoning,
      })

      await updateEvalRunObjectiveScore(db, evalRun.id, overall)
      log.info(`Objective metrics scored ${agentName}: overall=${overall.toFixed(3)}`)
    } catch (err) {
      log.error(`Objective metrics evaluation failed for ${agentName}: ${err}`)
    }
  }
}

// ─── Evaluator ───

async function runEvaluator(
  transcript: string,
  agentName: string,
  agentUtterances: string[],
  otherDebaterNames: string[],
): Promise<ObjectiveScore> {
  const prompt = buildObjectivePrompt(transcript, agentName, agentUtterances, otherDebaterNames)

  const message = await getAnthropicClient().messages.create({
    model: EVALUATOR_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content.find((c) => c.type === 'text')?.text ?? ''
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return ObjectiveScoreSchema.parse(JSON.parse(cleaned) as unknown)
}

// ─── Prompts ───

const SYSTEM_PROMPT =
  'You are an objective debate analyst. Your job is to verify specific, measurable properties of a debater\'s performance — not subjective quality or style. Score each dimension from 0.0 to 1.0 where 0.5 is average, 0.0 is poor, 1.0 is excellent. Respond with JSON only — no prose outside the JSON object.'

function buildObjectivePrompt(
  transcript: string,
  agentName: string,
  agentUtterances: string[],
  otherDebaterNames: string[],
): string {
  const utteranceSample = agentUtterances.slice(0, 20).join('\n---\n')
  const othersStr = otherDebaterNames.join(', ')

  return `## Full Debate Transcript
${transcript}

## Other Debaters in This Debate
${othersStr}

## Agent to Evaluate: ${agentName}

## ${agentName}'s Utterances
${utteranceSample}

## Scoring Task
Score ${agentName} on these 7 objective dimensions (0.0–1.0, 0.5 = average):

- **epistemic_discipline**: Does the agent distinguish facts from inferences from opinions? Do they acknowledge uncertainty and avoid overstating confidence in unverified claims?
- **distinctiveness**: Compared to the other debaters (${othersStr}), does this agent bring a genuinely distinct worldview and reasoning style — not just different vocabulary, but different underlying values or logic?
- **factual_accuracy**: Are the agent's verifiable factual claims accurate based on established knowledge? Penalise demonstrably false or misleading statements.
- **direct_rebuttal**: When opponents made specific named arguments or claims, did this agent address them directly? Penalise pivoting to new points without engaging the opponent's specific argument.
- **relevance**: Did the agent stay focused on the debate topic throughout? Penalise tangents, non-sequiturs, or topic drift.
- **consistency**: Were the agent's positions consistent across the debate? Penalise self-contradiction or unexplained position reversals.
- **claim_support**: Are the agent's assertions backed by reasoning, evidence, or examples — or are they bare assertions stated as fact?

Respond with this exact JSON structure:
{
  "epistemic_discipline": 0.0,
  "distinctiveness": 0.0,
  "factual_accuracy": 0.0,
  "direct_rebuttal": 0.0,
  "relevance": 0.0,
  "consistency": 0.0,
  "claim_support": 0.0,
  "reasoning": {
    "epistemic_discipline": "Brief justification",
    "distinctiveness": "Brief justification",
    "factual_accuracy": "Brief justification",
    "direct_rebuttal": "Brief justification",
    "relevance": "Brief justification",
    "consistency": "Brief justification",
    "claim_support": "Brief justification"
  }
}`
}

// ─── Helpers ───

function computeOverall(score: ObjectiveScore): number {
  return (
    score.epistemic_discipline +
    score.distinctiveness +
    score.factual_accuracy +
    score.direct_rebuttal +
    score.relevance +
    score.consistency +
    score.claim_support
  ) / 7
}

function buildTranscript(
  turns: Array<{
    speaker_id: string
    speaker_type: string
    transcript: string
    round_phase: string
    turn_index: number
  }>,
  participants: Array<{ agent_id: string; agents?: unknown }>,
): string {
  const nameMap = new Map<string, string>()
  for (const p of participants) {
    const name =
      (p as unknown as { agents?: { name?: string } }).agents?.name ?? p.agent_id.slice(0, 8)
    nameMap.set(p.agent_id, name)
  }

  return turns
    .sort((a, b) => a.turn_index - b.turn_index)
    .map((t) => {
      const speaker =
        t.speaker_type === 'moderator' ? 'Moderator' : (nameMap.get(t.speaker_id) ?? 'Unknown')
      return `[${t.round_phase.toUpperCase()}] ${speaker}: ${t.transcript}`
    })
    .join('\n\n')
}
