import { serve } from 'inngest/express'
import { inngest } from './inngest/client.js'
import { runPostDebatePipeline } from './functions/post-debate-pipeline.js'

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
      console.error('Pipeline error:', err)
      res.status(500).json({ error: 'Pipeline failed' })
    }
  })

  app.listen(port, () => {
    console.log(`Bipi Jobs Service running on port ${port}`)
    console.log(`Inngest endpoint: http://localhost:${port}/api/inngest`)
    console.log(`Health check: http://localhost:${port}/health`)
  })
}

const isDirectRun = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')
if (isDirectRun) {
  main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
