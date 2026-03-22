import { serve } from 'inngest/express'
import { createLogger, validateEnv, JOBS_ENV } from '@bipi/shared'
import { getSupabaseClient } from '@bipi/db'
import { inngest } from './inngest/client.js'
import { runPostDebatePipeline } from './functions/post-debate-pipeline.js'
import { runAiJudgeEvaluation } from './functions/ai-judge-evaluate.js'

const log = createLogger('jobs')

// ── Inngest Functions ──

const postDebatePipeline = inngest.createFunction(
  { id: 'post-debate-pipeline', name: 'Post-Debate Pipeline' },
  { event: 'debate/ended' },
  async ({ event, step }) => {
    const { debateId } = event.data as { debateId: string }

    const result = await step.run('run-pipeline', async () => {
      return runPostDebatePipeline(debateId)
    })

    return result
  },
)

// ── All registered functions ──
export const functions = [postDebatePipeline]

// ── Standalone server mode ──
// When run directly, starts an Express server to receive Inngest events.
// In production, this can also be served via a Next.js API route.

async function main() {
  validateEnv(JOBS_ENV, 'jobs')

  const { default: express } = await import('express')
  const app = express()
  const port = process.env.PORT ?? 3001

  app.use(
    '/api/inngest',
    serve({ client: inngest, functions }),
  )

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'bipi-jobs' })
  })

  // Manual trigger endpoint for testing
  app.post('/api/trigger-pipeline', express.json(), async (req, res) => {
    const { debateId } = req.body
    if (!debateId) {
      res.status(400).json({ error: 'Missing debateId' })
      return
    }

    try {
      const result = await runPostDebatePipeline(debateId)
      res.json(result)
    } catch (err) {
      log.error('Pipeline error', err)
      res.status(500).json({ error: 'Pipeline failed' })
    }
  })

  // Run AI judge evaluation on a specific debate (Layer 1 scoring)
  app.post('/api/run-ai-judges', express.json(), async (req, res) => {
    const { debateId } = req.body
    if (!debateId) {
      res.status(400).json({ error: 'Missing debateId' })
      return
    }

    try {
      const db = getSupabaseClient()
      await runAiJudgeEvaluation(db, debateId)
      res.json({ ok: true, debateId })
    } catch (err) {
      log.error('AI judge error', err)
      res.status(500).json({ error: 'AI judge evaluation failed' })
    }
  })

  app.listen(port, () => {
    log.info(`Jobs service running on port ${port}`)
    log.info(`Inngest endpoint: http://localhost:${port}/api/inngest`)
    log.info(`Health check: http://localhost:${port}/health`)
  })
}

const isDirectRun = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')
if (isDirectRun) {
  main().catch((err) => {
    log.error('Fatal error', err)
    process.exit(1)
  })
}
