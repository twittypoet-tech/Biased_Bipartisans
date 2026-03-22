import type { SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { z } from 'zod'
import {
  getDebateTurns,
  getDebateParticipants,
  getEvalRunsForDebate,
  insertJudgeScore,
  updateEvalRunAiJudgeScore,
} from '@bipi/db'
import { createLogger } from '@bipi/shared'
import type { UUID } from '@bipi/shared'

const log = createLogger('eval:ai-judge')

// Lazy singletons — instantiated on first use so missing API keys fail at call time, not startup
let _anthropic: Anthropic | null = null
let _openai: OpenAI | null = null

function getAnthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _anthropic
}

function getOpenAIClient(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

// ─── Zod Schema for Judge Output ───

const JudgeScoreSchema = z.object({
  argument_strength: z.number().min(0).max(1),
  logical_coherence: z.number().min(0).max(1),
  evidence_quality: z.number().min(0).max(1),
  responsiveness: z.number().min(0).max(1),
  rhetorical_effectiveness: z.number().min(0).max(1),
  reasoning: z.object({
    argument_strength: z.string(),
    logical_coherence: z.string(),
    evidence_quality: z.string(),
    responsiveness: z.string(),
    rhetorical_effectiveness: z.string(),
  }),
})

type JudgeScore = z.infer<typeof JudgeScoreSchema>

// ─── Judge Configuration ───
// TODO: Add Gemini, DeepSeek, Mistral, Llama judges in future versions.
// TODO: Add per-judge calibration weights after collecting data from 5-10 scored debates.
const JUDGES = [
  { provider: 'anthropic' as const, model: 'claude-sonnet-4-6' },
  { provider: 'openai' as const, model: 'gpt-4o' },
]

/**
 * Layer 1 of the 3-layer scoring system: AI Judge Panel.
 *
 * Sends the full debate transcript to Claude Sonnet and GPT-4o.
 * Each judge scores the agent on 5 dimensions (0-1 scale).
 * Average across judges → ai_judge_score on agent_eval_runs.
 * Individual judge scores stored in agent_eval_judge_scores for analysis.
 *
 * Must be called after evaluateDebate() — requires eval runs to exist.
 */
export async function runAiJudgeEvaluation(db: SupabaseClient, debateId: UUID): Promise<void> {
  const [turns, participants, evalRuns] = await Promise.all([
    getDebateTurns(db, debateId),
    getDebateParticipants(db, debateId),
    getEvalRunsForDebate(db, debateId),
  ])

  const debaterParticipants = participants.filter((p) => p.role === 'debater')
  if (debaterParticipants.length === 0) {
    log.warn(`No debaters found for debate ${debateId}, skipping AI judge evaluation`)
    return
  }

  const fullTranscript = buildTranscript(turns, participants)

  for (const participant of debaterParticipants) {
    const agentId = participant.agent_id
    const evalRun = evalRuns.find((r) => r.agent_id === agentId)
    if (!evalRun) {
      log.warn(`No eval run found for agent ${agentId} in debate ${debateId}, skipping`)
      continue
    }

    const agentTurns = turns.filter((t) => t.speaker_id === agentId && t.speaker_type === 'agent')
    const agentName = (participant as unknown as { agents?: { name?: string } }).agents?.name ?? agentId

    log.info(`Running AI judge evaluation for agent ${agentName}`)

    // Run all judges in parallel for this agent
    const judgeResults = await Promise.allSettled(
      JUDGES.map((judge) =>
        runJudge(
          judge,
          fullTranscript,
          agentName,
          agentTurns.map((t) => t.transcript),
        ),
      ),
    )

    const judgeScores: JudgeScore[] = []

    for (let i = 0; i < JUDGES.length; i++) {
      const judge = JUDGES[i]!
      const result = judgeResults[i]!

      if (result.status === 'rejected') {
        log.error(`Judge ${judge.provider}/${judge.model} failed for ${agentName}: ${result.reason}`)
        continue
      }

      const score = result.value
      const overall = computeOverall(score)

      await insertJudgeScore(db, {
        debate_id: debateId,
        agent_id: agentId,
        eval_run_id: evalRun.id,
        judge_model: judge.model,
        judge_provider: judge.provider,
        argument_strength: score.argument_strength,
        logical_coherence: score.logical_coherence,
        evidence_quality: score.evidence_quality,
        responsiveness: score.responsiveness,
        rhetorical_effectiveness: score.rhetorical_effectiveness,
        overall_score: overall,
        reasoning: score.reasoning,
      })

      judgeScores.push(score)
      log.info(`${judge.provider}/${judge.model} scored ${agentName}: overall=${overall.toFixed(3)}`)
    }

    if (judgeScores.length === 0) {
      log.warn(`All judges failed for agent ${agentName}, skipping ai_judge_score update`)
      continue
    }

    // Average across successful judges
    const avgJudgeScore =
      judgeScores.reduce((sum, s) => sum + computeOverall(s), 0) / judgeScores.length
    await updateEvalRunAiJudgeScore(db, evalRun.id, avgJudgeScore)
    log.info(
      `AI judge avg for ${agentName}: ${avgJudgeScore.toFixed(3)} (${judgeScores.length} judge(s))`,
    )
  }
}

// ─── Individual Judge Runners ───

async function runJudge(
  judge: { provider: 'anthropic' | 'openai'; model: string },
  transcript: string,
  agentName: string,
  agentUtterances: string[],
): Promise<JudgeScore> {
  const prompt = buildJudgingPrompt(transcript, agentName, agentUtterances)

  if (judge.provider === 'anthropic') {
    return runAnthropicJudge(judge.model, prompt)
  } else {
    return runOpenAIJudge(judge.model, prompt)
  }
}

async function runAnthropicJudge(model: string, prompt: string): Promise<JudgeScore> {
  const message = await getAnthropicClient().messages.create({
    model,
    max_tokens: 1024,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content.find((c) => c.type === 'text')?.text ?? ''
  return parseJudgeResponse(text)
}

async function runOpenAIJudge(model: string, prompt: string): Promise<JudgeScore> {
  const completion = await getOpenAIClient().chat.completions.create({
    model,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: JUDGE_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  })

  const text = completion.choices[0]?.message?.content ?? ''
  return parseJudgeResponse(text)
}

// ─── Prompts ───

const JUDGE_SYSTEM_PROMPT =
  'You are an impartial debate judge. Evaluate debaters fairly based only on argument quality, evidence, and engagement. Score each dimension from 0.0 to 1.0. Respond with JSON only — no prose outside the JSON object.'

function buildJudgingPrompt(
  transcript: string,
  agentName: string,
  agentUtterances: string[],
): string {
  // Cap utterance sample to avoid token limits on very long debates
  const utteranceSample = agentUtterances.slice(0, 20).join('\n---\n')

  return `## Full Debate Transcript
${transcript}

## Agent to Evaluate
${agentName}

## ${agentName}'s Utterances (for reference)
${utteranceSample}

## Scoring Task
Score ${agentName}'s debate performance on these 5 dimensions. Each score is 0.0–1.0 where 0.5 is average, 0.0 is very poor, and 1.0 is exceptional.

- **argument_strength**: How compelling and substantiated were the core arguments?
- **logical_coherence**: Was the reasoning internally consistent? Were contradictions avoided?
- **evidence_quality**: Did the agent cite credible evidence, data, or authoritative sources?
- **responsiveness**: Did the agent directly engage with and respond to opponents' specific points?
- **rhetorical_effectiveness**: Was the communication persuasive, clear, and well-structured?

Respond with this exact JSON structure:
{
  "argument_strength": 0.0,
  "logical_coherence": 0.0,
  "evidence_quality": 0.0,
  "responsiveness": 0.0,
  "rhetorical_effectiveness": 0.0,
  "reasoning": {
    "argument_strength": "Brief justification",
    "logical_coherence": "Brief justification",
    "evidence_quality": "Brief justification",
    "responsiveness": "Brief justification",
    "rhetorical_effectiveness": "Brief justification"
  }
}`
}

// ─── Helpers ───

function parseJudgeResponse(text: string): JudgeScore {
  // Strip markdown code fences if model wraps in them
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const parsed = JSON.parse(cleaned) as unknown
  return JudgeScoreSchema.parse(parsed)
}

function computeOverall(score: JudgeScore): number {
  return (
    (score.argument_strength +
      score.logical_coherence +
      score.evidence_quality +
      score.responsiveness +
      score.rhetorical_effectiveness) /
    5
  )
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
