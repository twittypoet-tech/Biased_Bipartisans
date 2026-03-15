import type {
  AgentArchetype,
  AgentRole,
  AgentStatus,
  ClaimTier,
  ConfigStatus,
  DebateStatus,
  EvolutionStage,
  LLMProvider,
  MemoryStatus,
  RhetoricalOS,
  RoomFormat,
  RoundPhase,
  SpeakerType,
  Temperament,
  UpdateClass,
  VoteType,
} from './enums'

// ─── Base Types ───

export type UUID = string
export type Timestamp = string // ISO 8601

// ─── Agent Types ───

export interface Agent {
  id: UUID
  name: string
  slug: string
  archetype: AgentArchetype
  role: AgentRole
  status: AgentStatus
  evolution_stage: EvolutionStage
  llm_provider: LLMProvider
  llm_model: string
  voice_id: string | null
  avatar_url: string | null
  short_bio: string
  created_at: Timestamp
  updated_at: Timestamp
}

// ─── Agent Config Types (versioned) ───

export interface AgentWorldview {
  id: UUID
  agent_id: UUID
  version: number
  status: ConfigStatus
  core_thesis: string
  issue_lenses: Record<string, string>
  values: string[]
  belief_rules: string[]
  source_rules: string[]
  concession_rules: string[]
  red_lines: string[]
  archetype_traits: string[]
  doctrine: string[]
  created_at: Timestamp
  updated_at: Timestamp
}

export interface AgentStyleProfile {
  id: UUID
  agent_id: UUID
  version: number
  status: ConfigStatus
  temperament: Temperament
  rhetorical_os: RhetoricalOS[]
  tone: string
  pace: string
  humor_level: number
  certainty_level: number
  interruption_tendency: number
  abstraction_level: number
  warmth: number
  rhetorical_devices: string[]
  sentence_style: string
  signature_behaviors: string[]
  created_at: Timestamp
  updated_at: Timestamp
}

export interface AgentPhraseBank {
  id: UUID
  agent_id: UUID
  version: number
  status: ConfigStatus
  openers: string[]
  attacks: string[]
  rebuttals: string[]
  concessions: string[]
  closers: string[]
  audience_callouts: string[]
  topic_specific_phrases: Record<string, string[]>
  created_at: Timestamp
  updated_at: Timestamp
}

export interface AgentEpistemicProfile {
  id: UUID
  agent_id: UUID
  version: number
  status: ConfigStatus
  default_claim_tier_tendency: ClaimTier
  evidence_preferences: string[]
  epistemic_red_lines: string[]
  speculation_tolerance: number
  high_risk_caution_topics: string[]
  source_quality_threshold: string
  created_at: Timestamp
  updated_at: Timestamp
}

export interface AgentRelationship {
  id: UUID
  agent_id: UUID
  target_agent_id: UUID
  respect_score: number
  distrust_score: number
  rivalry_score: number
  relationship_type: string
  attack_angles: string[]
  known_weak_points: string[]
  shared_history_summary: string | null
  updated_at: Timestamp
}

// ─── Debate Types ───

export interface DebateFormatDefinition {
  id: UUID
  name: string
  room_format: RoomFormat
  min_participants: number
  max_participants: number
  round_sequence: RoundDefinition[]
  moderator_behavior: Record<string, string>
  created_at: Timestamp
}

export interface RoundDefinition {
  phase: RoundPhase
  duration_seconds: number
  speaking_order: 'sequential' | 'directed' | 'free'
  allow_interruptions: boolean
  moderator_active: boolean
  description: string
}

export interface Debate {
  id: UUID
  title: string
  slug: string
  topic_framing: TopicFraming
  format_id: UUID
  status: DebateStatus
  scheduled_at: Timestamp | null
  started_at: Timestamp | null
  ended_at: Timestamp | null
  room_name: string
  created_at: Timestamp
  updated_at: Timestamp
}

export interface TopicFraming {
  headline: string
  conflict_description: string
  forced_tradeoff: string
  moral_tension: string | null
  strategic_tension: string | null
  identity_tension: string | null
  decision_surface: string
}

export interface DebateParticipant {
  id: UUID
  debate_id: UUID
  agent_id: UUID
  role: AgentRole
  speaking_order: number
  joined_at: Timestamp | null
}

export interface DebateTurn {
  id: UUID
  debate_id: UUID
  speaker_type: SpeakerType
  speaker_id: UUID
  round_phase: RoundPhase
  turn_index: number
  transcript: string
  claim_tier: ClaimTier | null
  claim_tags: string[]
  evidence_metadata: Record<string, unknown> | null
  duration_ms: number | null
  created_at: Timestamp
}

// ─── Audience / Voting Types ───

export interface DebateVote {
  id: UUID
  debate_id: UUID
  voter_id: string
  vote_type: VoteType
  target_agent_id: UUID | null
  target_turn_id: UUID | null
  round_phase: RoundPhase | null
  created_at: Timestamp
}

// ─── Evaluation Types ───

export interface AgentEvalRun {
  id: UUID
  debate_id: UUID
  agent_id: UUID
  epistemic_discipline_score: number | null
  persuasion_quality_score: number | null
  distinctiveness_score: number | null
  rivalry_dynamics_score: number | null
  participation_balance_score: number | null
  cast_chemistry_score: number | null
  overall_score: number | null
  scoring_details: Record<string, unknown>
  created_at: Timestamp
}

// ─── Memory Types ───

export interface AgentMemory {
  id: UUID
  agent_id: UUID
  debate_id: UUID | null
  status: MemoryStatus
  category: string
  content: string
  significance: number
  reviewed_at: Timestamp | null
  reviewed_by: string | null
  created_at: Timestamp
}

// ─── Evolution Types ───

export interface AgentTraitVector {
  id: UUID
  agent_id: UUID
  trait_name: string
  value: number
  update_class: UpdateClass
  last_updated_debate_id: UUID | null
  updated_at: Timestamp
}

export interface AgentArgumentLibrary {
  id: UUID
  agent_id: UUID
  argument_text: string
  topic: string
  effectiveness_score: number
  times_used: number
  last_used_at: Timestamp | null
  created_at: Timestamp
}

export interface AgentArgumentPerformance {
  id: UUID
  argument_id: UUID
  debate_id: UUID
  audience_reaction_score: number
  rebuttal_survived: boolean
  claim_tier_accuracy: ClaimTier | null
  created_at: Timestamp
}

export interface AgentTopicConfidence {
  id: UUID
  agent_id: UUID
  topic: string
  confidence_score: number
  debates_on_topic: number
  last_debated_at: Timestamp | null
  updated_at: Timestamp
}

export interface AgentReflection {
  id: UUID
  agent_id: UUID
  debate_id: UUID
  what_went_well: string[]
  what_went_poorly: string[]
  rival_lessons: Record<string, string>
  topic_lessons: string[]
  try_next_time: string[]
  stop_doing: string[]
  drift_signal: string | null
  created_at: Timestamp
}

export interface AgentDriftEvent {
  id: UUID
  agent_id: UUID
  from_stage: EvolutionStage
  to_stage: EvolutionStage
  trigger_description: string
  evidence_summary: string
  approved: boolean
  approved_at: Timestamp | null
  created_at: Timestamp
}

export interface AgentEvolutionSnapshot {
  id: UUID
  agent_id: UUID
  snapshot_type: 'weekly' | 'seasonal' | 'post_debate'
  trait_vector_snapshot: Record<string, number>
  archetype_at_time: AgentArchetype
  evolution_stage_at_time: EvolutionStage
  notes: string | null
  created_at: Timestamp
}
