import { fileURLToPath } from 'node:url'
import { cli, defineAgent, ServerOptions, type JobContext } from '@livekit/agents'
import { getSupabaseClient, getDebateParticipants } from '@bipi/db'
import { createLogger } from '@bipi/shared'

import { TurnController } from '../debate/turn-controller.js'
import { LiveKitRoomManager } from '../livekit/room-manager.js'
import { AudioPublisher } from '../livekit/audio-publisher.js'
import { createTTSPublishers } from './streaming-tts.js'

const log = createLogger('agents:debate-worker')

/**
 * LiveKit Agents worker for running AI debates.
 *
 * This worker registers with LiveKit Cloud. When a `debate-{debateId}` room
 * is created by the scheduler, LiveKit dispatches a job to this worker.
 *
 * The worker then:
 *   1. Extracts the debate ID from the room name
 *   2. Creates audio publishers (one per agent participant)
 *   3. Creates streaming TTS publishers (one per agent) using ElevenLabs
 *   4. Runs the TurnController which orchestrates the full debate
 *
 * Each agent appears as a separate named participant in the LiveKit room,
 * with their own audio track. Audience members subscribe to all tracks.
 *
 * Deployment:
 *   pnpm --filter @bipi/agents exec node dist/workers/debate-worker.js start
 *
 * Or in development:
 *   pnpm --filter @bipi/agents exec tsx src/workers/debate-worker.ts dev
 */
export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect()

    const roomName = ctx.room.name ?? ''
    log.info(`Debate worker started for room: ${roomName}`)

    // Extract debate ID from room name pattern: debate-{uuid}
    const debateIdMatch = roomName.match(/^debate-(.+)$/)
    if (!debateIdMatch) {
      log.error(`Invalid room name format: ${roomName} (expected "debate-{id}")`)
      return
    }

    const debateId = debateIdMatch[1]!
    log.info(`Running debate: ${debateId}`)

    const db = getSupabaseClient()
    const participants = await getDebateParticipants(db, debateId)

    if (participants.length === 0) {
      log.error(`No participants found for debate ${debateId}`)
      return
    }

    // --- LiveKit room manager (for audio tokens + data messages to audience) ---
    const roomManager = LiveKitRoomManager.isConfigured() ? new LiveKitRoomManager() : null
    if (!roomManager) {
      log.error('LiveKit not configured — LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET are required')
      return
    }

    // --- Audio publishers: one LiveKit participant per agent ---
    const livekitUrl = process.env.LIVEKIT_URL!
    const audioPublishers = new Map<string, AudioPublisher>()

    for (const p of participants) {
      const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
      const name = (agent?.name as string) ?? 'Unknown'
      const publisher = new AudioPublisher(name)
      const token = await roomManager.generateToken(
        roomName,
        name,
        `agent-${name.toLowerCase().replace(/\s+/g, '-')}`,
        'publisher',
      )

      try {
        await publisher.connect(livekitUrl, token)
        audioPublishers.set(p.agent_id, publisher)
      } catch (err) {
        log.warn(`Failed to connect audio publisher for ${name}`, { error: String(err) })
      }
    }

    // --- Streaming TTS publishers: one ElevenLabs connection per agent ---
    const participantMeta = participants.map((p) => {
      const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
      return {
        agentId: p.agent_id,
        archetype: (agent?.archetype as string) ?? 'moderator',
        voiceId: null,
      }
    })

    const elevenlabsEnabled = !!process.env.ELEVENLABS_API_KEY
    const ttsPublishers = elevenlabsEnabled
      ? createTTSPublishers(participantMeta)
      : new Map()

    if (!elevenlabsEnabled) {
      log.warn('ELEVENLABS_API_KEY not set — streaming TTS disabled (voice will be silent)')
    }

    // --- Run the debate ---
    const controller = new TurnController({
      debateId,
      ttsPublishers,
      audioPublishers,
      roomManager,
      roomName,
      onDebateComplete: async (summary) => {
        log.info(`Debate complete: ${debateId}`, {
          turns: summary.totalTurns,
          rounds: summary.roundsCompleted,
          durationMs: summary.durationMs,
        })

        // Broadcast debate_complete event to audience
        await roomManager.sendData(roomName, {
          type: 'debate_complete',
          timestamp: new Date().toISOString(),
        })
      },
    })

    try {
      await controller.initialize()
      await controller.run()
      log.info(`Debate ${debateId} finished successfully`)
    } catch (err) {
      log.error(`Debate ${debateId} failed`, { error: String(err) })
    } finally {
      // Clean up all audio publishers
      for (const [, publisher] of audioPublishers) {
        await publisher.disconnect().catch(() => {})
      }
      // Clean up TTS streams
      for (const [, tts] of ttsPublishers) {
        await tts.close().catch(() => {})
      }
    }
  },
})

// Start the worker when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.runApp(new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    wsURL: process.env.LIVEKIT_URL ?? '',
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    agentName: 'debate-worker',
  }))
}
