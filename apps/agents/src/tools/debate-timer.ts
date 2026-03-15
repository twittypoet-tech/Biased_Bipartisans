import type { AgentTool, AgentToolResult } from './types.js'

/**
 * Reports remaining time in the current round.
 * Agents can query this to pace their responses.
 */
export class DebateTimerTool implements AgentTool {
  readonly name = 'debate_timer'
  readonly description = 'Check how much time remains in the current debate round'

  private roundStartTime: number | null = null
  private roundDurationSeconds = 0

  startRound(durationSeconds: number) {
    this.roundStartTime = Date.now()
    this.roundDurationSeconds = durationSeconds
  }

  async execute(_params: Record<string, unknown>): Promise<AgentToolResult> {
    if (this.roundStartTime === null) {
      return { success: true, data: { remainingSeconds: 0, message: 'No round in progress' } }
    }

    const elapsed = (Date.now() - this.roundStartTime) / 1000
    const remaining = Math.max(0, this.roundDurationSeconds - elapsed)

    return {
      success: true,
      data: {
        remainingSeconds: Math.round(remaining),
        totalSeconds: this.roundDurationSeconds,
        elapsedSeconds: Math.round(elapsed),
      },
    }
  }
}
