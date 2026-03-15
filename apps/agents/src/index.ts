import http from 'node:http'
import { createLogger, validateEnv, AGENTS_ENV } from '@bipi/shared'

const log = createLogger('agents')

// Debate engine
export { DebateOrchestrator, type DebateOrchestratorConfig, type TurnResult, type DebateCompleteSummary } from './debate/orchestrator.js'
export { AgentRunner } from './debate/agent-runner.js'
export { ModeratorRunner, type ModeratorParticipant } from './debate/moderator-runner.js'

// LLM providers
export { getLLMProvider } from './llm/index.js'
export type { LLMProvider, LLMMessage, LLMCompletionRequest, LLMCompletionResponse } from './llm/types.js'

// Services
export { DebateStateManager, type DebateParticipantInfo, type DebateSummary } from './services/debate-state.js'
export { persistTurn, extractClaimTier, buildRoundSummary } from './services/turn-persistence.js'

// Tools
export type { AgentTool, AgentToolResult } from './tools/types.js'
export { DebateTimerTool } from './tools/debate-timer.js'
export { VoteStateTool } from './tools/vote-state.js'

// Voice
export type { VoiceProvider, Voice, SynthesisResult } from './voice/types.js'
export { OpenAITTSProvider } from './voice/openai-tts.js'
export { PlaceholderVoiceProvider } from './voice/placeholder-provider.js'
export { getVoiceProvider, ARCHETYPE_VOICE_MAP, getVoiceId } from './voice/index.js'

// LiveKit
export { LiveKitRoomManager, DebateRoomBridge, AudioPublisher, type VoiceAgent } from './livekit/index.js'

// Research tool
export { ResearchTool } from './tools/research.js'

// Prompt builders
export {
  buildOpeningPrompt,
  buildRebuttalPrompt,
  buildPressurePrompt,
  buildClosingPrompt,
  formatTurnsAsContext,
  buildContextUpdate,
  type TurnRecord,
} from './debate/turn-prompt-builder.js'

/**
 * Quick-start: run a debate from the command line.
 *
 *   DEBATE_ID=<uuid> pnpm --filter @bipi/agents dev
 *
 * Enable voice (agents speak via OpenAI TTS in LiveKit):
 *   DEBATE_ID=<uuid> ENABLE_VOICE=true pnpm --filter @bipi/agents dev
 */
async function main() {
  validateEnv(AGENTS_ENV, 'agents')

  // Start health check server
  const healthPort = parseInt(process.env.HEALTH_PORT ?? '3002', 10)
  const healthServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'bipi-agents', uptime: process.uptime() }))
  })
  healthServer.listen(healthPort, () => {
    log.info(`Health check on port ${healthPort}`)
  })

  const debateId = process.env.DEBATE_ID
  if (!debateId) {
    log.info('Agent worker ready. Set DEBATE_ID env var to run a debate.')
    return
  }

  const enableVoice = process.env.ENABLE_VOICE === 'true'
  log.info(`Starting debate: ${debateId}${enableVoice ? ' (voice enabled)' : ''}`)

  // Set up LiveKit room bridge (with optional voice)
  const { DebateRoomBridge } = await import('./livekit/debate-room.js')
  const { LiveKitRoomManager } = await import('./livekit/room-manager.js')
  let bridge: InstanceType<typeof DebateRoomBridge> | null = null

  if (LiveKitRoomManager.isConfigured()) {
    let voiceProvider = undefined
    if (enableVoice) {
      const { getVoiceProvider } = await import('./voice/index.js')
      voiceProvider = getVoiceProvider('openai')
      log.info('Voice mode: OpenAI TTS enabled')
    }

    bridge = new DebateRoomBridge(voiceProvider)
    await bridge.connect(`debate-${debateId}`)
  }

  const { DebateOrchestrator: Orchestrator } = await import('./debate/orchestrator.js')
  const orchestrator = new Orchestrator({
    debateId,
    onTurnComplete: async (turn) => {
      const label = turn.isModerator ? '[MOD]' : `[${turn.archetype.toUpperCase()}]`
      log.info(`${label} ${turn.speakerName}: ${turn.transcript.slice(0, 120)}...`)

      // Publish turn to LiveKit room (with voice synthesis if enabled)
      if (bridge) {
        await bridge.publishTurn(turn)
      }
    },
    onRoundComplete: async (phase, summary) => {
      log.info(`Round complete: ${phase}`, { summary: summary.slice(0, 200) })
      if (bridge) {
        await bridge.publishRoundComplete(phase, summary)
      }
    },
    onDebateComplete: async (summary) => {
      log.info('Debate complete', {
        turns: summary.totalTurns,
        rounds: summary.roundsCompleted,
        durationMs: summary.durationMs,
      })
      if (bridge) {
        await bridge.disconnect()
      }
    },
  })

  await orchestrator.initialize()

  // Set up voice agents after initialization (we need participant info)
  if (bridge?.voiceEnabled) {
    const participants = orchestrator.getParticipants()
    await bridge.setupVoiceAgents(
      participants.map((p) => ({
        agentId: p.agentId,
        name: p.name,
        archetype: p.archetype,
        voiceId: null, // Will fall back to archetype mapping
      })),
    )
  }

  await orchestrator.run()
}

// Run if executed directly
const isDirectRun = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')
if (isDirectRun) {
  main().catch((err) => {
    log.error('Fatal error', err)
    process.exit(1)
  })
}
