import { getSupabaseClient, awardTournamentTrophy, getTournamentById } from '@bipi/db'
import { createLogger } from '@bipi/shared'
import { inngest } from '../inngest/client.js'
import type { UUID } from '@bipi/shared'

const log = createLogger('jobs:award-trophy')

/**
 * Award trophies after a tournament final completes.
 *
 * Listens to 'tournament/round-completed' events where isFinal=true.
 *
 * Awards:
 *  - champion   → the final winner
 *  - finalist   → the runner-up (lost in the final)
 *  - semifinalist → agents who lost in the penultimate round
 */
export const awardTrophyFn = inngest.createFunction(
  { id: 'award-tournament-trophy', name: 'Award Tournament Trophy' },
  { event: 'tournament/round-completed' },
  async ({ event, step }) => {
    const { tournamentId, winnerAgentId, isFinal } = event.data as {
      tournamentId: UUID
      roundNumber: number
      isFinal: boolean
      winnerAgentId: UUID
    }

    // Only proceed for the final round
    if (!isFinal) return { skipped: true, reason: 'Not the final round' }

    const db = getSupabaseClient()

    // Step 1: Award champion trophy
    await step.run('award-champion', () =>
      awardTournamentTrophy(db, winnerAgentId, tournamentId, 'champion'),
    )
    log.info(`Champion trophy awarded to agent ${winnerAgentId} for tournament ${tournamentId}`)

    // Step 2: Find and award finalist trophy (loser of the final)
    await step.run('award-finalist', async () => {
      const { data: finalMatchup } = await db
        .from('tournament_matchups')
        .select('agent_a_id, agent_b_id, winner_agent_id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed')
        .order('round_number', { ascending: false })
        .limit(1)
        .single()

      if (!finalMatchup) return

      const finalistId =
        finalMatchup.agent_a_id === winnerAgentId
          ? finalMatchup.agent_b_id
          : finalMatchup.agent_a_id

      if (finalistId) {
        await awardTournamentTrophy(db, finalistId as UUID, tournamentId, 'finalist')
        log.info(`Finalist trophy awarded to agent ${finalistId}`)
      }
    })

    // Step 3: Find and award semifinalist trophies (losers of penultimate round, if 8+ bracket)
    await step.run('award-semifinalists', async () => {
      const tournament = await getTournamentById(db, tournamentId)
      if (!tournament || tournament.total_rounds < 2) return

      const semiFinalRound = tournament.total_rounds - 1
      const { data: semiMatchups } = await db
        .from('tournament_matchups')
        .select('agent_a_id, agent_b_id, winner_agent_id')
        .eq('tournament_id', tournamentId)
        .eq('round_number', semiFinalRound)
        .eq('status', 'completed')

      for (const m of semiMatchups ?? []) {
        const loserId =
          m.agent_a_id === m.winner_agent_id ? m.agent_b_id : m.agent_a_id
        if (loserId) {
          await awardTournamentTrophy(db, loserId as UUID, tournamentId, 'semifinalist')
          log.info(`Semifinalist trophy awarded to agent ${loserId}`)
        }
      }
    })

    // Step 4: Mark tournament as completed with champion
    await step.run('complete-tournament', async () => {
      await db
        .from('tournaments')
        .update({ status: 'completed', champion_agent_id: winnerAgentId })
        .eq('id', tournamentId)
    })

    log.info(`Tournament ${tournamentId} completed. Champion: ${winnerAgentId}`)
    return { trophiesAwarded: true, champion: winnerAgentId }
  },
)
