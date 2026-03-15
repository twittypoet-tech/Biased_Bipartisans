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

export type Events =
  | DebateEndedEvent
  | EvalCompleteEvent
  | MemoriesExtractedEvent
  | ReflectionsCompleteEvent
