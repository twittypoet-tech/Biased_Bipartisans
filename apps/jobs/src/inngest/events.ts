/** Inngest event type definitions for the Bipi pipeline */

export interface DebateEndedEvent {
  name: 'debate/ended'
  data: {
    debateId: string
  }
}

export interface EvalCompleteEvent {
  name: 'eval/complete'
  data: {
    debateId: string
    agentIds: string[]
  }
}

export interface MemoriesExtractedEvent {
  name: 'memories/extracted'
  data: {
    debateId: string
    agentIds: string[]
  }
}

export interface ReflectionsCompleteEvent {
  name: 'reflections/complete'
  data: {
    debateId: string
    agentIds: string[]
  }
}

export interface TournamentMatchupCompletedEvent {
  name: 'tournament/matchup-completed'
  data: {
    matchupId: string
    tournamentId: string
    debateId: string
    winnerAgentId: string
    roundNumber: number
  }
}

export interface TournamentRoundCompletedEvent {
  name: 'tournament/round-completed'
  data: {
    tournamentId: string
    roundNumber: number
    isFinal: boolean
    winnerAgentId: string
  }
}

export type Events =
  | DebateEndedEvent
  | EvalCompleteEvent
  | MemoriesExtractedEvent
  | ReflectionsCompleteEvent
  | TournamentMatchupCompletedEvent
  | TournamentRoundCompletedEvent
