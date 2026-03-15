import { fileURLToPath } from 'node:url'
import { cli, defineAgent, ServerOptions, type JobContext } from '@livekit/agents'
import { getSupabaseClient, getDebateParticipants } from '@bipi/db'
import { createLogger } from '@bipi/shared'

import { LiveConversation } from '../debate/live-conversation.js'
import { LiveKitRoomManager } from '../livekit/room-manager.js'
import { AudioPublisher } from '../livekit/audio-publisher.js'
import { createTTSPublishers } from './streaming-tts.js'

const log = createLogger('agents:live-debate-worker')

/**
 * LiveKit Agent worker for LIVE, reactive AI debates.
 *
 * Unlike the original debate-worker (which used TurnController — a scripted,
 * sequential debate), this worker runs LiveConversation — a fully reactive
 * engine where each agent responds to exactly what the other just said.
 *
 * Features:
 *  - Agents react to each other's actual words in real-time
 *  - Sentence-boundary interrupts (yield floor mid-speech)
 *  - Audience Q&A: text questions are injected as natural conversation beats
 *  - No predetermined round sequence — conversation flows naturally
 *
 * Deployment:
 *   pnpm --filter @bipi/agents exec tsx src/workers/live-debate-worker.ts dev
 *   pnpm --filter @bipi/agents exec node dist/workers/live-debate-worker.js start
 */
export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect()

    const roomName = ctx.room.name ?? ''
    log.info(`Live debate worker started for room: ${roomName}`)

    // Room name format: debate-{uuid}
    const debateIdMatch = roomName.match(/^debate-(.+)$/)
    if (!debateIdMatch) {
      log.error(`Invalid room name format: ${roomName} (expected "debate-{id}")`)
      return
    }

    const debateId = debateIdMatch[1]!
    log.info(`Running live debate: ${debateId}`)

    const db = getSupabaseClient()
    const participants = await getDebateParticipants(db, debateId)

    if (participants.length === 0) {
      log.error(`No participants found for debate ${debateId}`)
      return
    }

    // LiveKit room manager — required for token generation + data messages
    const roomManager = LiveKitRoomManager.isConfigured() ? new LiveKitRoomManager() : null
    if (!roomManager) {
      log.error('LiveKit not configured — LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET are required')
      return
    }

    // ── Audio publishers: one LiveKit participant per agent ────────────────
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
        log.info(`Audio publisher connected: ${name}`)
      } catch (err) {
        log.warn(`Failed to connect audio publisher for ${name}`, { error: String(err) })
      }
    }

    // ── ElevenLabs streaming TTS per agent ────────────────────────────────
    const elevenlabsEnabled = !!process.env.ELEVENLABS_API_KEY
    if (!elevenlabsEnabled) {
      log.warn('ELEVENLABS_API_KEY not set — agents will be silent (text-only)')
    }

    const participantMeta = participants.map((p) => {
      const agent = (p as unknown as Record<string, unknown>).agents as Record<string, unknown> | undefined
      return {
        agentId: p.agent_id,
        archetype: (agent?.archetype as string) ?? 'moderator',
        voiceId: (agent?.voice_id as string | null) ?? null,
      }
    })

    const ttsPublishers = elevenlabsEnabled ? createTTSPublishers(participantMeta) : new Map()

    // ── Run the live conversation ─────────────────────────────────────────
    const conversation = new LiveConversation({
      debateId,
      maxExchanges: 10,      // 10 back-and-forth exchanges per debate
      audienceCheckInterval: 2,  // check for audience questions every 2 exchanges
      ttsPublishers,
      audioPublishers,
      roomManager,
      roomName,
      onDebateComplete: async ({ totalTurns, durationMs }) => {
        log.info(`Debate complete`, { debateId, totalTurns, durationMs })
        await roomManager.sendData(roomName, {
          type: 'debate_complete',
          timestamp: new Date().toISOString(),
        }).catch(() => {})
      },
    })

    try {
      await conversation.initialize()
      await conversation.run()
      log.info(`Live debate ${debateId} finished successfully`)
    } catch (err) {
      log.error(`Live debate ${debateId} failed`, { error: String(err) })
    } finally {
      for (const [, publisher] of audioPublishers) {
        await publisher.disconnect().catch(() => {})
      }
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
    agentName: 'live-debate-worker',
  }))
}
