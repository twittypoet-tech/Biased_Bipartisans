import type { TopicFraming, RoundDefinition } from '@bipi/agent-core'

export interface TurnRecord {
  speakerName: string
  archetype: string
  transcript: string
}

/**
 * Builds the user-message prompts sent to agents for each debate phase.
 * These prompts are the "what to do now" instructions that sit on top of
 * the system prompt (which defines WHO the agent is).
 */

export function buildOpeningPrompt(topic: TopicFraming, round: RoundDefinition): string {
  return [
    `It's the opening round. Present your opening position.`,
    '',
    `**Topic**: ${topic.headline}`,
    `**Conflict**: ${topic.conflictDescription}`,
    `**Forced tradeoff**: ${topic.forcedTradeoff}`,
    `**Decision surface**: ${topic.decisionSurface}`,
    '',
    `You have ~${round.durationSeconds} seconds worth of speaking time.`,
    'State your position clearly. Ground it in your worldview.',
    'Classify any strong claims by tier (verified, plausible inference, speculative, or narrative).',
  ].join('\n')
}

export function buildRebuttalPrompt(
  previousTurns: TurnRecord[],
  round: RoundDefinition,
  targetAgent?: string,
): string {
  const turnsContext = formatTurnsAsContext(previousTurns)
  const targetLine = targetAgent
    ? `The moderator directs you to respond specifically to **${targetAgent}**.`
    : 'Respond to the arguments you find most worth challenging.'

  return [
    `It's the rebuttal round. Challenge what was said.`,
    '',
    '**What was said so far:**',
    turnsContext,
    '',
    targetLine,
    '',
    `You have ~${round.durationSeconds} seconds of speaking time.`,
    'Attack the weakest points. Defend your position where challenged.',
    'Classify any strong claims by tier.',
  ].join('\n')
}

export function buildPressurePrompt(
  previousTurns: TurnRecord[],
  round: RoundDefinition,
  moderatorDirective: string,
): string {
  const turnsContext = formatTurnsAsContext(previousTurns)

  return [
    `It's the pressure round. The moderator has directed the conversation.`,
    '',
    `**Moderator directive**: ${moderatorDirective}`,
    '',
    '**Debate so far:**',
    turnsContext,
    '',
    `You have ~${round.durationSeconds} seconds of speaking time.`,
    'Address the moderator\'s question directly. No evasion.',
    'This is where you must defend your hardest positions.',
  ].join('\n')
}

export function buildClosingPrompt(
  previousTurns: TurnRecord[],
  round: RoundDefinition,
): string {
  const turnsContext = formatTurnsAsContext(previousTurns)

  return [
    `It's the closing round. Deliver your final argument.`,
    '',
    '**Full debate context:**',
    turnsContext,
    '',
    `You have ~${round.durationSeconds} seconds of speaking time.`,
    'Summarize your strongest case. Acknowledge where the other side was strong.',
    'Leave the audience with your most compelling point.',
    'Do not introduce entirely new arguments — synthesize what was debated.',
  ].join('\n')
}

/**
 * Format an array of turns into a readable context block.
 */
export function formatTurnsAsContext(turns: TurnRecord[]): string {
  if (turns.length === 0) return '(No previous turns)'

  return turns
    .map((t) => `**${t.speakerName}** (${t.archetype}):\n${t.transcript}`)
    .join('\n\n---\n\n')
}

/**
 * Build the context message sent to other agents after a turn completes.
 * This lets agents "hear" what was said without it being a prompt to respond.
 */
export function buildContextUpdate(turn: TurnRecord): string {
  return `[${turn.speakerName} (${turn.archetype}) just said]:\n${turn.transcript}`
}
