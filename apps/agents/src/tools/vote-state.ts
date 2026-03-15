import type { SupabaseClient } from '@supabase/supabase-js'
import { getDebateVotes } from '@bipi/db'
import type { AgentTool, AgentToolResult } from './types.js'

/**
 * Reports current audience vote tallies for the debate.
 * Agents can use this to gauge audience reception.
 */
export class VoteStateTool implements AgentTool {
  readonly name = 'vote_state'
  readonly description = 'Check current audience vote tallies for this debate'

  private db: SupabaseClient
  private debateId: string

  constructor(db: SupabaseClient, debateId: string) {
    this.db = db
    this.debateId = debateId
  }

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    const voteType = params.vote_type as string | undefined
    const roundPhase = params.round_phase as string | undefined

    const votes = await getDebateVotes(this.db, this.debateId, {
      vote_type: voteType,
      round_phase: roundPhase,
    })

    // Tally votes by target agent
    const tally: Record<string, number> = {}
    for (const vote of votes) {
      if (vote.target_agent_id) {
        tally[vote.target_agent_id] = (tally[vote.target_agent_id] ?? 0) + 1
      }
    }

    return {
      success: true,
      data: {
        totalVotes: votes.length,
        tallyByAgent: tally,
        voteType: voteType ?? 'all',
      },
    }
  }
}
