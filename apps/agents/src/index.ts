import http from 'node:http'
import { createLogger, validateEnv, AGENTS_ENV } from '@bipi/shared'
import { DebateScheduler } from './scheduler.js'

const log = createLogger('agents')

// NOTE: This is a standalone service, not a library. No re-exports needed.
// All @livekit/rtc-node consumers (AudioRelay, AudioPublisher, ReporterRelay)
// are loaded lazily via dynamic import() to prevent the native addon from
// crashing the process at startup (SIGSEGV from Rust binary init).

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
  // Diagnostic heartbeat — writes to stderr (unbuffered) every 5s.
  // If heartbeats stop in Railway logs, the process died (likely SIGSEGV).
  const heartbeat = setInterval(() => {
    process.stderr.write(`[heartbeat] ${new Date().toISOString()} pid=${process.pid}\n`)
  }, 5000)
  heartbeat.unref()

  process.on('uncaughtException', (err) => {
    process.stderr.write(`[CRASH] uncaughtException: ${err.message}\n${err.stack}\n`)
    log.error('Uncaught exception — exiting', { error: err.message, stack: err.stack })
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    process.stderr.write(`[CRASH] unhandledRejection: ${String(reason)}\n`)
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
    if (req.method === 'POST' && url === '/reporter/relay') {
      log.info('Reporter relay request received')
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

      try {
        const { ReporterRelay } = await import('./retell/reporter-relay.js')
        const relay = new ReporterRelay()
        const { publicRoomUrl, browserToken } = await relay.prepare()

        relay.start({ wireAccessToken, reporterAccessToken }).catch((err) => {
          log.error('ReporterRelay failed to start', { error: String(err) })
          relay.stop()
        })

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, publicRoomUrl, browserToken }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log.error('ReporterRelay prepare failed', { error: msg })
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: msg }))
      }
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
