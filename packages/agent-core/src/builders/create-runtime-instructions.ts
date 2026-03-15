import type { PersonaPacket } from '../schemas/persona-packet'

/**
 * Assembles runtime instructions (system prompt) from a PersonaPacket.
 *
 * This is the function that converts structured config into the actual prompt
 * that guides the LLM during a debate. The prompt is assembled from distinct
 * sections — never a monolithic hardcoded string.
 *
 * Architecture rule from the design docs:
 * "Agents must not be defined as giant hardcoded prompt strings.
 *  Each runtime agent persona must be assembled from structured config objects."
 */
export function createRuntimeInstructions(packet: PersonaPacket): string {
  const sections: string[] = []

  // 1. Role & Identity
  sections.push(buildRoleSection(packet))

  // 2. Worldview & Doctrine
  sections.push(buildWorldviewSection(packet))

  // 3. Epistemic Discipline
  sections.push(buildEpistemicSection(packet))

  // 4. Style & Voice
  sections.push(buildStyleSection(packet))

  // 5. Phrase Guidance
  sections.push(buildPhraseSection(packet))

  // 6. Relationship Context (room-specific)
  if (packet.relationships.length > 0) {
    sections.push(buildRelationshipSection(packet))
  }

  // 7. Memory Context
  if (packet.relevantMemories.length > 0) {
    sections.push(buildMemorySection(packet))
  }

  // 8. Room Context (debate-specific)
  sections.push(buildRoomContextSection(packet))

  // 9. Runtime Rules
  sections.push(buildRulesSection(packet))

  return sections.join('\n\n')
}

function buildRoleSection(packet: PersonaPacket): string {
  const lines = [
    `# Role: ${packet.name}`,
    '',
    `You are ${packet.name}, a ${packet.archetype} in a structured AI debate.`,
    `Your role: ${packet.role}.`,
    '',
    `Short identity: You are a persistent public debate persona — not a generic AI assistant. ` +
      `You have a worldview, a voice, rivalries, and memories. Listeners should recognize you ` +
      `within moments of hearing you speak.`,
  ]
  return lines.join('\n')
}

function buildWorldviewSection(packet: PersonaPacket): string {
  const wv = packet.worldview
  const lines = [
    '# Worldview & Doctrine',
    '',
    `## Core Thesis`,
    wv.coreThesis,
    '',
    '## Doctrine (your foundational beliefs)',
    ...wv.doctrine.map((d) => `- ${d}`),
    '',
    '## Values',
    ...wv.values.map((v) => `- ${v}`),
    '',
    '## Issue Lenses (how you interpret different domains)',
    ...Object.entries(wv.issueLenses).map(([domain, lens]) => `- **${domain}**: ${lens}`),
    '',
    '## Belief Rules',
    ...wv.beliefRules.map((r) => `- ${r}`),
    '',
    '## Source Rules',
    ...wv.sourceRules.map((r) => `- ${r}`),
    '',
    '## Concession Rules',
    ...wv.concessionRules.map((r) => `- ${r}`),
    '',
    '## Red Lines (NEVER cross these)',
    ...wv.redLines.map((r) => `- ${r}`),
  ]
  return lines.join('\n')
}

function buildEpistemicSection(packet: PersonaPacket): string {
  const ep = packet.epistemic
  const lines = [
    '# Epistemic Discipline',
    '',
    'You operate under a 4-tier claim classification system. Every meaningful claim you make ' +
      'must be classifiable into one of these tiers:',
    '',
    '1. **Verified**: Strongly supported, attributable, grounded in credible evidence',
    '2. **Plausible inference**: Reasonable interpretation of known facts, presented honestly as interpretation',
    '3. **Speculative**: Possible but weakly supported — must be labeled as uncertain',
    '4. **Narrative/rhetoric**: Interpretive framing, metaphor, persuasive synthesis — not factual assertion',
    '',
    `Your default tendency: ${ep.defaultClaimTierTendency}`,
    `Speculation tolerance: ${(ep.speculationTolerance * 100).toFixed(0)}%`,
    '',
    '## Your Evidence Preferences',
    ...ep.evidencePreferences.map((p) => `- ${p}`),
    '',
    '## Your Epistemic Red Lines',
    ...ep.epistemicRedLines.map((r) => `- ${r}`),
  ]

  if (ep.highRiskCautionTopics.length > 0) {
    lines.push(
      '',
      '## High-Risk Topics (extra caution required)',
      ...ep.highRiskCautionTopics.map((t) => `- ${t}`),
    )
  }

  if (packet.runtimeConstraints.speculationRequiresLabel) {
    lines.push(
      '',
      '**RULE**: When making speculative claims, you MUST explicitly label them as speculation. ' +
        'Unlabeled speculation is treated as an epistemic violation.',
    )
  }

  if (packet.runtimeConstraints.mustClassifyClaims) {
    lines.push(
      '',
      '**RULE**: When making a substantive claim, briefly indicate its tier. ' +
        'Examples: "The evidence clearly shows..." (verified), "I believe this suggests..." (plausible inference), ' +
        '"This is speculative, but..." (speculative).',
    )
  }

  return lines.join('\n')
}

function buildStyleSection(packet: PersonaPacket): string {
  const st = packet.style
  const lines = [
    '# Voice & Style',
    '',
    `Temperament: ${st.temperament}`,
    `Tone: ${st.tone}`,
    `Pace: ${st.pace}`,
    `Sentence style: ${st.sentenceStyle}`,
    '',
    `Humor level: ${describeLevel(st.humorLevel)} (${(st.humorLevel * 100).toFixed(0)}%)`,
    `Certainty level: ${describeLevel(st.certaintyLevel)} (${(st.certaintyLevel * 100).toFixed(0)}%)`,
    `Interruption tendency: ${describeLevel(st.interruptionTendency)} (${(st.interruptionTendency * 100).toFixed(0)}%)`,
    `Abstraction level: ${describeLevel(st.abstractionLevel)} (${(st.abstractionLevel * 100).toFixed(0)}%)`,
    `Warmth: ${describeLevel(st.warmth)} (${(st.warmth * 100).toFixed(0)}%)`,
    '',
    '## Rhetorical Methods',
    ...st.rhetoricalOS.map((r) => `- ${r.replace(/_/g, ' ')}`),
    '',
    '## Rhetorical Devices',
    ...st.rhetoricalDevices.map((d) => `- ${d}`),
    '',
    '## Signature Behaviors (these make you recognizable)',
    ...st.signatureBehaviors.map((b) => `- ${b}`),
  ]
  return lines.join('\n')
}

function buildPhraseSection(packet: PersonaPacket): string {
  const ph = packet.phrases
  const lines = [
    '# Phrase Guidance',
    '',
    'These are characteristic phrases that reflect your voice. Draw from them naturally ' +
      '— do not recite them verbatim every time, but let them influence your expression.',
    '',
    '## Opening Phrases',
    ...ph.openers.map((p) => `- "${p}"`),
    '',
    '## Attack Phrases',
    ...ph.attacks.map((p) => `- "${p}"`),
    '',
    '## Rebuttal Phrases',
    ...ph.rebuttals.map((p) => `- "${p}"`),
    '',
    '## Concession Phrases',
    ...ph.concessions.map((p) => `- "${p}"`),
    '',
    '## Closing Phrases',
    ...ph.closers.map((p) => `- "${p}"`),
  ]

  if (ph.audienceCallouts.length > 0) {
    lines.push('', '## Audience Callouts', ...ph.audienceCallouts.map((p) => `- "${p}"`))
  }

  return lines.join('\n')
}

function buildRelationshipSection(packet: PersonaPacket): string {
  const lines = [
    '# Relationships with Other Participants',
    '',
    'These are your current relationships with the agents in this room. ' +
      'Use this context to inform how you engage with each opponent.',
  ]

  for (const rel of packet.relationships) {
    lines.push(
      '',
      `## ${rel.targetAgentName} (${rel.relationshipType.replace(/_/g, ' ')})`,
      `- Respect: ${(rel.respectScore * 100).toFixed(0)}%`,
      `- Distrust: ${(rel.distrustScore * 100).toFixed(0)}%`,
      `- Rivalry: ${(rel.rivalryScore * 100).toFixed(0)}%`,
    )

    if (rel.attackAngles.length > 0) {
      lines.push('- Attack angles:', ...rel.attackAngles.map((a) => `  - ${a}`))
    }
    if (rel.knownWeakPoints.length > 0) {
      lines.push('- Known weak points:', ...rel.knownWeakPoints.map((w) => `  - ${w}`))
    }
    if (rel.sharedHistorySummary) {
      lines.push(`- History: ${rel.sharedHistorySummary}`)
    }
  }

  return lines.join('\n')
}

function buildMemorySection(packet: PersonaPacket): string {
  const lines = [
    '# Relevant Memories',
    '',
    'These are approved memories from your past debates. Reference them when relevant ' +
      '— they are part of your persistent identity.',
  ]

  for (const mem of packet.relevantMemories) {
    lines.push(`- [${mem.category}] ${mem.content}`)
  }

  return lines.join('\n')
}

function buildRoomContextSection(packet: PersonaPacket): string {
  const tf = packet.topicFraming
  const lines = [
    '# Current Debate Context',
    '',
    `**Topic**: ${tf.headline}`,
    `**Conflict**: ${tf.conflictDescription}`,
    `**Forced Tradeoff**: ${tf.forcedTradeoff}`,
    `**Decision Surface**: ${tf.decisionSurface}`,
  ]

  if (tf.moralTension) lines.push(`**Moral Tension**: ${tf.moralTension}`)
  if (tf.strategicTension) lines.push(`**Strategic Tension**: ${tf.strategicTension}`)
  if (tf.identityTension) lines.push(`**Identity Tension**: ${tf.identityTension}`)

  lines.push(
    '',
    '## Round Structure',
    ...packet.roundSequence.map(
      (r, i) =>
        `${i + 1}. **${r.phase}** (${r.durationSeconds}s) — ${r.description}` +
        (r.allowInterruptions ? ' [interruptions allowed]' : ''),
    ),
  )

  return lines.join('\n')
}

function buildRulesSection(packet: PersonaPacket): string {
  const rc = packet.runtimeConstraints
  const lines = [
    '# Runtime Rules',
    '',
    `- Maximum turn length: ~${rc.maxTurnLengthTokens} tokens. Be concise and impactful.`,
    `- You MUST stay in character as ${packet.name} at all times.`,
    '- You are a persistent public persona, not an AI assistant. Never break character.',
    '- Never say "as an AI" or refer to yourself as artificial.',
    '- Engage directly with opponents — name them, reference their specific claims.',
    '- Make your worldview legible. Listeners should know who you are and what you stand for.',
  ]

  if (!rc.allowInterruptions) {
    lines.push('- Wait for your turn. Do not interrupt other speakers in this round.')
  }

  return lines.join('\n')
}

function describeLevel(value: number): string {
  if (value <= 0.2) return 'very low'
  if (value <= 0.4) return 'low'
  if (value <= 0.6) return 'moderate'
  if (value <= 0.8) return 'high'
  return 'very high'
}
