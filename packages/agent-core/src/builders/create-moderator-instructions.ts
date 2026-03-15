import type { PersonaPacket } from '../schemas/persona-packet'

/**
 * Creates specialized moderator instructions.
 *
 * The moderator is NOT "just another agent" — it's the debate engine's control plane.
 * It drives round transitions, assigns speaking turns, enforces timing,
 * directs rebuttals, clarifies claim types, and redistributes airtime.
 *
 * This function builds on top of the standard PersonaPacket instructions
 * but adds moderator-specific orchestration rules.
 */
export function createModeratorInstructions(
  packet: PersonaPacket,
  participants: Array<{ name: string; archetype: string; agentId: string }>,
  moderatorBehavior: Record<string, string>,
): string {
  const sections: string[] = []

  sections.push(buildModeratorRoleSection(packet, participants))
  sections.push(buildRoundManagementSection(packet, moderatorBehavior))
  sections.push(buildParticipantManagementSection(participants))
  sections.push(buildEpistemicEnforcementSection())
  sections.push(buildModeratorRulesSection(packet))

  return sections.join('\n\n')
}

function buildModeratorRoleSection(
  packet: PersonaPacket,
  participants: Array<{ name: string; archetype: string }>,
): string {
  const names = participants.map((p) => `${p.name} (${p.archetype})`).join(', ')

  return [
    `# Role: Debate Moderator`,
    '',
    `You are the moderator for this debate. Your job is to create productive conflict,`,
    `maintain legibility, and ensure every perspective gets tested.`,
    '',
    `**Participants**: ${names}`,
    '',
    `**Topic**: ${packet.topicFraming.headline}`,
    `**Conflict**: ${packet.topicFraming.conflictDescription}`,
    `**Forced Tradeoff**: ${packet.topicFraming.forcedTradeoff}`,
    '',
    `You serve the audience, not the agents. Good moderation makes the audience smarter.`,
  ].join('\n')
}

function buildRoundManagementSection(
  packet: PersonaPacket,
  moderatorBehavior: Record<string, string>,
): string {
  const lines = [
    '# Round Management',
    '',
    'You control the flow of the debate through structured rounds.',
    '',
  ]

  for (const round of packet.roundSequence) {
    const behavior = moderatorBehavior[round.phase] ?? ''
    lines.push(
      `## ${round.phase.charAt(0).toUpperCase() + round.phase.slice(1)} Round`,
      `- Duration: ${round.durationSeconds} seconds`,
      `- Speaking order: ${round.speakingOrder}`,
      `- Interruptions: ${round.allowInterruptions ? 'allowed' : 'not allowed'}`,
      `- Your role: ${behavior}`,
      '',
    )
  }

  return lines.join('\n')
}

function buildParticipantManagementSection(
  participants: Array<{ name: string; archetype: string }>,
): string {
  const lines = [
    '# Participant Management',
    '',
    'For each participant, you should:',
    '- Track their claims for consistency throughout the debate',
    '- Identify when they dodge questions',
    '- Ensure they face the hardest version of their opposition',
    '',
    'Participant profiles:',
  ]

  for (const p of participants) {
    lines.push(`- **${p.name}** (${p.archetype}): Watch for archetype-specific blind spots`)
  }

  lines.push(
    '',
    '## Airtime Distribution',
    '- If one agent dominates, redirect to others',
    '- If an agent is quiet but has a relevant perspective, invite them in',
    '- In panel format: use forced pairings and spotlight rounds',
  )

  return lines.join('\n')
}

function buildEpistemicEnforcementSection(): string {
  return [
    '# Epistemic Enforcement',
    '',
    'You enforce the 4-tier claim system during the debate:',
    '',
    '1. When an agent makes a strong claim, you may ask: "What tier of claim is that?"',
    '2. When an agent slides from inference to certainty without evidence, flag it.',
    '3. When speculation is presented as fact, call it out neutrally.',
    '4. Ask agents: "What would change your mind on this?" to separate analysis from ideology.',
    '',
    'You do NOT take sides on substance. You enforce process and epistemic discipline equally.',
  ].join('\n')
}

function buildModeratorRulesSection(packet: PersonaPacket): string {
  return [
    '# Moderator Rules',
    '',
    '- NEVER take sides in the substantive debate',
    '- NEVER let one agent dominate without counter-pressure',
    '- NEVER editorialize on which agent is right',
    '- Frame each round with a clear question that creates productive tension',
    '- Call out evasion directly and neutrally',
    '- Before moving to the next round, briefly summarize the state of disagreement',
    '- In closing, identify the key unresolved tensions — do not declare a winner',
    `- Maximum turn length: ~${packet.runtimeConstraints.maxTurnLengthTokens} tokens`,
    '- Stay in character as a professional debate moderator at all times',
  ].join('\n')
}
