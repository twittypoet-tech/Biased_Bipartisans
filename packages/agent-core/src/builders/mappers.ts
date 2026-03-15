import type {
  AgentWorldview,
  AgentStyleProfile,
  AgentPhraseBank,
  AgentEpistemicProfile,
  AgentRelationship,
} from '@bipi/shared'
import type { WorldviewConfig } from '../schemas/worldview'
import type { StyleProfile } from '../schemas/style'
import type { PhraseBank } from '../schemas/phrasebank'
import type { EpistemicProfile } from '../schemas/epistemic'
import type { RelationshipProfile } from '../schemas/relationship'

/**
 * Maps a database AgentWorldview record to the validated WorldviewConfig type.
 */
export function mapWorldviewToConfig(row: AgentWorldview): WorldviewConfig {
  return {
    coreThesis: row.core_thesis,
    issueLenses: row.issue_lenses as Record<string, string>,
    values: row.values,
    beliefRules: row.belief_rules,
    sourceRules: row.source_rules,
    concessionRules: row.concession_rules,
    redLines: row.red_lines,
    archetypeTraits: row.archetype_traits,
    doctrine: row.doctrine,
  }
}

/**
 * Maps a database AgentStyleProfile record to the validated StyleProfile type.
 */
export function mapStyleToConfig(row: AgentStyleProfile): StyleProfile {
  return {
    temperament: row.temperament,
    rhetoricalOS: row.rhetorical_os,
    tone: row.tone,
    pace: row.pace,
    humorLevel: row.humor_level,
    certaintyLevel: row.certainty_level,
    interruptionTendency: row.interruption_tendency,
    abstractionLevel: row.abstraction_level,
    warmth: row.warmth,
    rhetoricalDevices: row.rhetorical_devices,
    sentenceStyle: row.sentence_style,
    signatureBehaviors: row.signature_behaviors,
  }
}

/**
 * Maps a database AgentPhraseBank record to the validated PhraseBank type.
 */
export function mapPhrasesToConfig(row: AgentPhraseBank): PhraseBank {
  return {
    openers: row.openers,
    attacks: row.attacks,
    rebuttals: row.rebuttals,
    concessions: row.concessions,
    closers: row.closers,
    audienceCallouts: row.audience_callouts,
    topicSpecificPhrases: row.topic_specific_phrases as Record<string, string[]>,
  }
}

/**
 * Maps a database AgentEpistemicProfile record to the validated EpistemicProfile type.
 */
export function mapEpistemicToConfig(row: AgentEpistemicProfile): EpistemicProfile {
  return {
    defaultClaimTierTendency: row.default_claim_tier_tendency as EpistemicProfile['defaultClaimTierTendency'],
    evidencePreferences: row.evidence_preferences,
    epistemicRedLines: row.epistemic_red_lines,
    speculationTolerance: row.speculation_tolerance,
    highRiskCautionTopics: row.high_risk_caution_topics,
    sourceQualityThreshold: row.source_quality_threshold,
  }
}

/**
 * Maps a database AgentRelationship record to the validated RelationshipProfile type.
 */
export function mapRelationshipToProfile(
  row: AgentRelationship,
  targetName: string,
): RelationshipProfile {
  return {
    targetAgentId: row.target_agent_id,
    targetAgentName: targetName,
    respectScore: row.respect_score,
    distrustScore: row.distrust_score,
    rivalryScore: row.rivalry_score,
    relationshipType: row.relationship_type,
    attackAngles: row.attack_angles,
    knownWeakPoints: row.known_weak_points,
    sharedHistorySummary: row.shared_history_summary,
  }
}
