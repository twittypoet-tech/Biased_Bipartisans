import http from 'node:http'
import { createLogger, validateEnv, AGENTS_ENV } from '@bipi/shared'
import { DebateScheduler } from './scheduler.js'

const log = createLogger('agents')

// Debate engine
export { DebateOrchestrator, type DebateOrchestratorConfig, type TurnResult as OrchestratorTurnResult, type DebateCompleteSummary } from './debate/orchestrator.js'
export { TurnController, type TurnResult, type TurnControllerConfig, type DebateCompleteSummary as TurnControllerSummary } from './debate/turn-controller.js'
export { AgentRunner } from './debate/agent-runner.js'
export { ModeratorRunner, type ModeratorParticipant } from './debate/moderator-runner.js'

// LLM providers
export { getLLMProvider } from './llm/index.js'
export type { LLMProvider, LLMMessage, LLMCompletionRequest, LLMCompletionResponse } from './llm/types.js'

// Services
export { DebateStateManager, type DebateParticipantInfo, type DebateSummary } from './services/debate-state.js'
export { persistTurn, extractClaimTier, buildRoundSummary } from './services/turn-persistence.js'
export { VoiceSynthesizer, type SynthesizedTurn } from './services/voice-synthesizer.js'
export { uploadTurnAudio } from './services/audio-storage.js'

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

// Scheduler
export { DebateScheduler } from './scheduler.js'

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
 * Main entry point for the agents service.
 *
 * Starts a health check server and the debate scheduler.
 * The scheduler polls for debates with status='scheduled' that are due,
 * then runs the full TurnController + streaming voice pipeline automatically.
 *
 * Voice uses ElevenLabs streaming TTS when ELEVENLABS_API_KEY is set.
 * LiveKit audio publishing enabled when LIVEKIT_URL is configured.
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

  const ttsMode = process.env.ELEVENLABS_API_KEY ? 'elevenlabs-streaming' : 'disabled (set ELEVENLABS_API_KEY)'
  log.info(`Voice mode: ${ttsMode}`)

  // Start the debate scheduler
  const scheduler = new DebateScheduler()
  scheduler.start()

  log.info('Agents service ready — scheduler polling for due debates')

  // Graceful shutdown
  process.on('SIGINT', () => {
    log.info('Shutting down...')
    scheduler.stop()
    healthServer.close()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    log.info('Shutting down...')
    scheduler.stop()
    healthServer.close()
    process.exit(0)
  })
}

// Run if executed directly
const isDirectRun = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')
if (isDirectRun) {
  main().catch((err) => {
    log.error('Fatal error', err)
    process.exit(1)
  })
}
