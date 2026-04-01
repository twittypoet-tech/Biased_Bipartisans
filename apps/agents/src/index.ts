import http from 'node:http'
import { createLogger, validateEnv, AGENTS_ENV } from '@bipi/shared'
import { DebateScheduler } from './scheduler.js'
import { ReporterRelay } from './retell/reporter-relay.js'

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

// Retell
export { AudioRelay, DebateConductor, collectTranscripts, RETELL_LIVEKIT_URL } from './retell/index.js'
export type { RelayAgent, DebateConductorConfig } from './retell/index.js'

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
  process.on('uncaughtException', (err) => {
    log.error('Uncaught exception — exiting', { error: err.message, stack: err.stack })
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled promise rejection — exiting', { reason: String(reason) })
    process.exit(1)
  })

  validateEnv(AGENTS_ENV, 'agents')

  const scheduler = new DebateScheduler()

  // Start HTTP server — health check + debate trigger endpoint
  const healthPort = parseInt(process.env.PORT ?? process.env.HEALTH_PORT ?? '3002', 10)
  const triggerSecret = process.env.AGENTS_TRIGGER_SECRET

  const healthServer = http.createServer(async (req, res) => {
    const url = req.url ?? '/'

    // Health check
    if (req.method === 'GET' && url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', service: 'bipi-agents', uptime: process.uptime(), active: scheduler.activeCount }))
      return
    }

    // Direct trigger: POST /debates/:id/trigger
    // Allows the web app to fire a freeflow debate immediately without waiting for the scheduler poll.
    const triggerMatch = url.match(/^\/debates\/([^/]+)\/trigger$/)
    if (req.method === 'POST' && triggerMatch) {
      // Validate trigger secret if configured
      if (triggerSecret) {
        const auth = req.headers.authorization ?? ''
        if (auth !== `Bearer ${triggerSecret}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Unauthorized' }))
          return
        }
      }

      const debateId = triggerMatch[1]!
      log.info(`Direct trigger received for debate ${debateId}`)

      // Validate synchronously so errors are returned to the caller,
      // then fire the long-running debate run in the background.
      try {
        await scheduler.triggerDebate(debateId)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, debateId, message: 'Debate triggered' }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log.error(`Trigger validation failed for debate ${debateId}`, { error: msg })
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: msg }))
      }
      return
    }

    // Stop endpoint: POST /debates/:id/stop
    const stopMatch = url.match(/^\/debates\/([^/]+)\/stop$/)
    if (req.method === 'POST' && stopMatch) {
      if (triggerSecret) {
        const auth = req.headers.authorization ?? ''
        if (auth !== `Bearer ${triggerSecret}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Unauthorized' }))
          return
        }
      }
      const debateId = stopMatch[1]!
      log.info(`Stop request received for debate ${debateId}`)
      scheduler.stopDebate(debateId)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, debateId, message: 'Debate stop signal sent' }))
      return
    }

    // Reporter relay: POST /reporter/relay
    // Connects the Wire Host and The Reporter in the same audio session so
    // The Reporter hears the Wire's greeting and Retell doesn't time out.
    if (req.method === 'POST' && url === '/reporter/relay') {
      if (triggerSecret) {
        const auth = req.headers.authorization ?? ''
        if (auth !== `Bearer ${triggerSecret}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Unauthorized' }))
          return
        }
      }

      let body: { wireAccessToken?: string; reporterAccessToken?: string } = {}
      try {
        const raw = await new Promise<string>((resolve, reject) => {
          let data = ''
          req.on('data', (chunk) => { data += chunk })
          req.on('end', () => resolve(data))
          req.on('error', reject)
        })
        body = JSON.parse(raw)
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
        return
      }

      const { wireAccessToken, reporterAccessToken } = body
      if (!wireAccessToken || !reporterAccessToken) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'wireAccessToken and reporterAccessToken required' }))
        return
      }

      // Respond immediately — relay runs in background
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))

      const relay = new ReporterRelay()
      relay.start({ wireAccessToken, reporterAccessToken }).catch((err) => {
        log.error('ReporterRelay failed to start', { error: String(err) })
      })
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  })

  healthServer.listen(healthPort, () => {
    log.info(`HTTP server on port ${healthPort}`)
  })

  const ttsMode = process.env.ELEVENLABS_API_KEY ? 'elevenlabs-streaming' : 'disabled (set ELEVENLABS_API_KEY)'
  log.info(`Voice mode: ${ttsMode}`)

  // Start the debate scheduler (handles time-based auto-start)
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

// Run if executed directly (handles .ts, .js, .cjs, .mjs)
const isDirectRun = /index\.(ts|js|cjs|mjs)$/.test(process.argv[1] ?? '')
if (isDirectRun) {
  main().catch((err) => {
    log.error('Fatal error', err)
    process.exit(1)
  })
}
