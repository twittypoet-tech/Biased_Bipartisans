import type { RoundPhase } from '@bipi/shared'

export interface DebateParticipantInfo {
  agentId: string
  name: string
  archetype: string
  role: 'debater' | 'moderator'
  speakingOrder: number
}

export interface DebateSummary {
  totalTurns: number
  roundsCompleted: number
  airtimeByAgent: Record<string, number>
  durationMs: number
}

/**
 * Tracks the live state of a debate — current round, turn index,
 * airtime distribution, and timing.
 */
export class DebateStateManager {
  private _currentRound = 0
  private _currentPhase: RoundPhase
  private _turnIndex = 0
  private _airtimeByAgent = new Map<string, number>()
  private _startedAt: Date
  private _roundPhases: RoundPhase[]

  constructor(roundPhases: RoundPhase[]) {
    this._roundPhases = roundPhases
    this._currentPhase = roundPhases[0] ?? ('opening' as RoundPhase)
    this._startedAt = new Date()
  }

  get currentRound(): number { return this._currentRound }
  get currentPhase(): RoundPhase { return this._currentPhase }
  get turnIndex(): number { return this._turnIndex }
  get startedAt(): Date { return this._startedAt }

  /**
   * Record that an agent took a turn. Increments their airtime and the global turn index.
   */
  recordTurn(agentId: string): number {
    const current = this._airtimeByAgent.get(agentId) ?? 0
    this._airtimeByAgent.set(agentId, current + 1)
    const idx = this._turnIndex
    this._turnIndex++
    return idx
  }

  /**
   * Record a moderator turn (counts toward turn index but not agent airtime).
   */
  recordModeratorTurn(): number {
    const idx = this._turnIndex
    this._turnIndex++
    return idx
  }

  /**
   * Advance to the next round in the sequence.
   * Returns false if the debate is over (no more rounds).
   */
  advanceRound(): boolean {
    this._currentRound++
    if (this._currentRound >= this._roundPhases.length) {
      return false
    }
    this._currentPhase = this._roundPhases[this._currentRound]!
    return true
  }

  /**
   * Get speaking order for debaters in the current phase.
   * OPENING/CLOSING: sequential by speaking_order
   * REBUTTAL: reverse of speaking_order
   * PRESSURE: sequential (moderator directs via prompts)
   */
  getSpeakingOrder(participants: DebateParticipantInfo[]): DebateParticipantInfo[] {
    const debaters = participants
      .filter((p) => p.role === 'debater')
      .sort((a, b) => a.speakingOrder - b.speakingOrder)

    if (this._currentPhase === 'rebuttal') {
      return [...debaters].reverse()
    }

    return debaters
  }

  /**
   * Check if the moderator should interject due to airtime imbalance.
   * Returns the agentId of the over-represented agent, or null.
   */
  checkAirtimeImbalance(threshold = 2): string | null {
    if (this._airtimeByAgent.size < 2) return null

    const counts = Array.from(this._airtimeByAgent.entries())
    const max = counts.reduce((a, b) => (a[1] > b[1] ? a : b))
    const min = counts.reduce((a, b) => (a[1] < b[1] ? a : b))

    if (max[1] - min[1] >= threshold) {
      return max[0]
    }
    return null
  }

  /**
   * Get a summary of the debate state for closing/evaluation.
   */
  getDebateSummary(): DebateSummary {
    const airtimeRecord: Record<string, number> = {}
    for (const [agentId, count] of this._airtimeByAgent) {
      airtimeRecord[agentId] = count
    }

    return {
      totalTurns: this._turnIndex,
      roundsCompleted: this._currentRound + 1,
      airtimeByAgent: airtimeRecord,
      durationMs: Date.now() - this._startedAt.getTime(),
    }
  }

  /**
   * Whether the debate has more rounds remaining.
   */
  hasMoreRounds(): boolean {
    return this._currentRound < this._roundPhases.length - 1
  }
}
