import type { AgentTool, AgentToolResult } from './types.js'
import { createLogger } from '@bipi/shared'

const log = createLogger('agents:research')

/**
 * Research tool using Tavily's search API.
 *
 * Allows agents to look up real-time information during debates.
 * Results are treated as room-context evidence only — they never
 * overwrite an agent's worldview or core positions.
 *
 * Gracefully returns empty results if TAVILY_API_KEY is not set.
 */
export class ResearchTool implements AgentTool {
  readonly name = 'research'
  readonly description = 'Search the web for current information on a topic using Tavily'

  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY
    if (!this.apiKey) {
      log.warn('TAVILY_API_KEY not set — research tool will return empty results')
    }
  }

  async execute(params: Record<string, unknown>): Promise<AgentToolResult> {
    const query = params.query as string
    if (!query) {
      return { success: false, data: null, error: 'Missing required parameter: query' }
    }

    if (!this.apiKey) {
      return {
        success: true,
        data: { results: [], note: 'Research tool not configured (no API key)' },
      }
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 5,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error('Tavily API error', new Error(errorText))
        return { success: false, data: null, error: `Tavily API error: ${response.status}` }
      }

      const data = (await response.json()) as TavilyResponse

      const results = data.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      }))

      return {
        success: true,
        data: {
          answer: data.answer,
          results,
          note: 'Research result — room-context evidence only, not worldview',
        },
      }
    } catch (err) {
      log.error('Research tool error', err)
      return { success: false, data: null, error: 'Research tool failed' }
    }
  }

  static isConfigured(): boolean {
    return !!process.env.TAVILY_API_KEY
  }
}

interface TavilyResponse {
  answer: string
  results: Array<{
    title: string
    url: string
    content: string
    score: number
  }>
}
