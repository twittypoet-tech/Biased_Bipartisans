import { getSupabaseClient, advanceTournamentWinner, isRoundComplete, createTournamentDebate, getTournamentById } from '@bipi/db'
import { generateRoomName } from '@bipi/agent-core'
import { generateTournamentDebateSlug } from '@bipi/db'
import { createLogger } from '@bipi/shared'
import { inngest } from '../inngest/client.js'
import type { UUID } from '@bipi/shared'

const log = createLogger('jobs:advance-tournament')

/**
 * Advance a tournament after a matchup debate has been scored.
 *
 * Listens to 'tournament/matchup-completed' events emitted by the
 * post-debate pipeline when it detects a debate belongs to a tournament.
 *
 * Steps:
 *  1. Record winner on the matchup, propagate to next matchup slot
 *  2. If next matchup now has both agents → create its debate
 *  3. If all matchups in the round are done → mark round complete,
 *     advance tournament.current_round
 *  4. If this was the final → emit 'tournament/round-completed' with isFinal=true
 */
export const advanceTournamentRoundFn = inngest.createFunction(
  { id: 'advance-tournament-round', name: 'Advance Tournament Round' },
  { event: 'tournament/matchup-completed' },
  async ({ event, step }) => {
    const { matchupId, tournamentId, winnerAgentId, roundNumber } = event.data as {
      matchupId: UUID
      tournamentId: UUID
      debateId: UUID
      winnerAgentId: UUID
      roundNumber: number
    }

    const db = getSupabaseClient()

    // Step 1: Advance the winner to the next matchup slot
    const { nextMatchupId } = await step.run('advance-winner', () =>
      advanceTournamentWinner(db, matchupId, winnerAgentId),
    )

    log.info(
      `Matchup ${matchupId} winner ${winnerAgentId} advanced. Next matchup: ${nextMatchupId ?? 'none (final)'}`,
    )

    // Step 2: If there's a next matchup, check if it now has both agents → create debate
    if (nextMatchupId) {
      await step.run('maybe-create-next-debate', async () => {
        const { data: nextMatchup } = await db
          .from('tournament_matchups')
          .select('id, agent_a_id, agent_b_id, round_number, matchup_number, status, scheduled_at')
          .eq('id', nextMatchupId)
          .single()

        if (
          nextMatchup &&
          nextMatchup.agent_a_id !== null &&
          nextMatchup.agent_b_id !== null &&
          nextMatchup.status === 'pending'
        ) {
          const tournament = await getTournamentById(db, tournamentId)
          if (!tournament) return

          // Find moderator from an existing R1 debate in this tournament
          const { data: existingParticipant } = await db
            .from('debate_participants')
            .select('agent_id, debates!inner(tournament_id)')
            .eq('debates.tournament_id', tournamentId)
            .eq('role', 'moderator')
            .limit(1)
            .single()

          const debateSlug = generateTournamentDebateSlug(
            tournament.slug,
            nextMatchup.round_number as number,
            nextMatchup.matchup_number as number,
          )
          const roomName = generateRoomName(debateSlug)

          const participants: Array<{ agent_id: UUID; role: string; speaking_order: number }> = [
            { agent_id: nextMatchup.agent_a_id as UUID, role: 'debater', speaking_order: 1 },
            { agent_id: nextMatchup.agent_b_id as UUID, role: 'debater', speaking_order: 2 },
          ]
          if (existingParticipant?.agent_id) {
            participants.push({
              agent_id: existingParticipant.agent_id as UUID,
              role: 'moderator',
              speaking_order: 0,
            })
          }

          await createTournamentDebate(db, nextMatchupId, tournamentId, {
            title: tournament.topic_title,
            slug: debateSlug,
            topic_framing: tournament.topic_framing,
            format_id: tournament.format_id,
            room_name: roomName,
            scheduled_at: nextMatchup.scheduled_at as string | null,
            participants,
          })

          log.info(`Created debate for next matchup ${nextMatchupId}: ${debateSlug}`)
        }
      })
    }

    // Step 3: Check if the round is complete
    const roundComplete = await step.run('check-round-complete', () =>
      isRoundComplete(db, tournamentId, roundNumber),
    )

    if (!roundComplete) return { advanced: true, roundComplete: false }

    // Mark round complete
    await step.run('mark-round-complete', async () => {
      await db
        .from('tournament_rounds')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('tournament_id', tournamentId)
        .eq('round_number', roundNumber)
    })

    const tournament = await step.run('get-tournament', () => getTournamentById(db, tournamentId))
    if (!tournament) return { advanced: true, roundComplete: true }

    const isFinal = roundNumber >= tournament.total_rounds

    if (isFinal) {
      // Emit final event for trophy awarding
      await step.sendEvent('emit-tournament-complete', {
        name: 'tournament/round-completed',
        data: {
          tournamentId,
          roundNumber,
          isFinal: true,
          winnerAgentId,
        },
      })
      log.info(`Tournament ${tournamentId} final complete. Champion: ${winnerAgentId}`)
    } else {
      // Advance to next round
      await step.run('advance-round-counter', async () => {
        await db
          .from('tournaments')
          .update({ current_round: roundNumber + 1 })
          .eq('id', tournamentId)
      })
      log.info(`Tournament ${tournamentId} advanced to round ${roundNumber + 1}`)
    }

    return { advanced: true, roundComplete: true, isFinal }
  },
)
