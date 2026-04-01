// Agent archetypes — the 8 defined in the Persona Constitution + reporter
export const AgentArchetype = {
  HAWK: 'hawk',
  DOVE: 'dove',
  TECHNOCRAT: 'technocrat',
  POPULIST: 'populist',
  CYNIC: 'cynic',
  CONSPIRACY_THEORIST: 'conspiracy_theorist',
  INSTITUTIONALIST: 'institutionalist',
  LIBERTARIAN: 'libertarian',
  REPORTER: 'reporter',
} as const
export type AgentArchetype = (typeof AgentArchetype)[keyof typeof AgentArchetype]

// Agent temperaments from the Persona Constitution
export const Temperament = {
  CALM: 'calm',
  CLINICAL: 'clinical',
  SUSPICIOUS: 'suspicious',
  FIERY: 'fiery',
  AMUSED: 'amused',
  GRIM: 'grim',
  WEARY: 'weary',
  FORMAL: 'formal',
  SELF_RIGHTEOUS: 'self_righteous',
} as const
export type Temperament = (typeof Temperament)[keyof typeof Temperament]

// Rhetorical operating systems from the Persona Constitution
export const RhetoricalOS = {
  HISTORICAL_PRECEDENT: 'historical_precedent',
  MECHANISM_ANALYSIS: 'mechanism_analysis',
  MORAL_JUDGMENT: 'moral_judgment',
  RIDICULE: 'ridicule',
  PLAINSPOKEN_SIMPLIFICATION: 'plainspoken_simplification',
  PROCEDURAL_LEGITIMACY: 'procedural_legitimacy',
  PATTERN_RECOGNITION: 'pattern_recognition',
  LEGALISTIC_PRECISION: 'legalistic_precision',
  EMOTIONAL_VIVIDNESS: 'emotional_vividness',
  PRACTICAL_TRADEOFFS: 'practical_tradeoffs',
} as const
export type RhetoricalOS = (typeof RhetoricalOS)[keyof typeof RhetoricalOS]

// Agent classification status
export const AgentStatus = {
  OFFICIAL: 'official',
  GUEST: 'guest',
  SANDBOX: 'sandbox',
} as const
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus]

// Agent role in a debate
export const AgentRole = {
  DEBATER: 'debater',
  MODERATOR: 'moderator',
  REPORTER: 'reporter',
} as const
export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole]

// Report categories — shared between news_reports and reporter_calls
export const ReportCategory = {
  ENVIRONMENTAL_SCIENCE: 'Environmental Science',
  HISTORY_POLITICS: 'History & Politics',
  LAW_JURISPRUDENCE: 'Law & Jurisprudence',
  MEDICINE_HEALTHCARE: 'Medicine & Healthcare',
  PHILOSOPHY_ETHICS: 'Philosophy & Ethics',
  RHETORIC_PERSUASION: 'Rhetoric & Persuasion',
  STATISTICS_DATA_SCIENCE: 'Statistics & Data Science',
  TECHNOLOGY_INNOVATION: 'Technology & Innovation',
} as const
export type ReportCategory = (typeof ReportCategory)[keyof typeof ReportCategory]

// Report quality from Retell post-call analysis
export const ReportQuality = {
  COMPLETE: 'Complete',
  PARTIAL: 'Partial',
  FAILED: 'Failed',
} as const
export type ReportQuality = (typeof ReportQuality)[keyof typeof ReportQuality]

// User sentiment from Retell post-call analysis
export const UserSentiment = {
  POSITIVE: 'Positive',
  NEUTRAL: 'Neutral',
  NEGATIVE: 'Negative',
} as const
export type UserSentiment = (typeof UserSentiment)[keyof typeof UserSentiment]

// Config version status
export const ConfigStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const
export type ConfigStatus = (typeof ConfigStatus)[keyof typeof ConfigStatus]

// Debate status lifecycle
export const DebateStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  STARTING: 'starting',  // atomically claimed by scheduler — transient before 'live'
  LIVE: 'live',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const
export type DebateStatus = (typeof DebateStatus)[keyof typeof DebateStatus]

// Room format archetypes from the Debate Format Framework
export const RoomFormat = {
  DUEL: 'duel',
  TRIANGLE: 'triangle',
  PANEL_CLASH: 'panel_clash',
  TRIBUNAL: 'tribunal',
  CROSSFIRE: 'crossfire',
  SYNTHESIS: 'synthesis',
} as const
export type RoomFormat = (typeof RoomFormat)[keyof typeof RoomFormat]

// Round phases from the Debate Format Framework
// 'discussion' added for freeflow debate style (migration 007)
export const RoundPhase = {
  OPENING: 'opening',
  REBUTTAL: 'rebuttal',
  PRESSURE: 'pressure',
  AUDIENCE_EVIDENCE: 'audience_evidence',
  CLOSING: 'closing',
  DISCUSSION: 'discussion',
} as const
export type RoundPhase = (typeof RoundPhase)[keyof typeof RoundPhase]

// Epistemic claim tiers from the Epistemic Charter
export const ClaimTier = {
  VERIFIED: 'verified',
  PLAUSIBLE_INFERENCE: 'plausible_inference',
  SPECULATIVE: 'speculative',
  NARRATIVE_RHETORIC: 'narrative_rhetoric',
} as const
export type ClaimTier = (typeof ClaimTier)[keyof typeof ClaimTier]

// Vote types — structured from the Debate Format Framework
export const VoteType = {
  STRONGEST_ARGUMENT: 'strongest_argument',
  BEST_EVIDENCE: 'best_evidence',
  ROUND_WINNER: 'round_winner',
  MOST_PERSUASIVE: 'most_persuasive',
  MOST_EVASIVE: 'most_evasive',
  BEST_REBUTTAL: 'best_rebuttal',
  BEST_CONCESSION: 'best_concession',
  EXTEND_CLASH: 'extend_clash',
} as const
export type VoteType = (typeof VoteType)[keyof typeof VoteType]

// Speaker type in a debate turn
export const SpeakerType = {
  AGENT: 'agent',
  MODERATOR: 'moderator',
  AUDIENCE: 'audience',
} as const
export type SpeakerType = (typeof SpeakerType)[keyof typeof SpeakerType]

// Memory status for the gating pipeline
export const MemoryStatus = {
  CANDIDATE: 'candidate',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANON: 'canon',
} as const
export type MemoryStatus = (typeof MemoryStatus)[keyof typeof MemoryStatus]

// Evolution stages from the Evolution Policy
export const EvolutionStage = {
  STABLE: 'stable',
  VARIANT: 'variant',
  HYBRID: 'hybrid',
  RECLASSIFICATION_CANDIDATE: 'reclassification_candidate',
  RECLASSIFIED: 'reclassified',
} as const
export type EvolutionStage = (typeof EvolutionStage)[keyof typeof EvolutionStage]

// Evolution update classes from the Evolution Policy
export const UpdateClass = {
  AUTO: 'auto',
  SLOW_ADAPTIVE: 'slow_adaptive',
  PROTECTED: 'protected',
} as const
export type UpdateClass = (typeof UpdateClass)[keyof typeof UpdateClass]

// LLM provider for multi-provider architecture
export const LLMProvider = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
} as const
export type LLMProvider = (typeof LLMProvider)[keyof typeof LLMProvider]
