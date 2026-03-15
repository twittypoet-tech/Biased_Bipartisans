import type { SupabaseClient } from '@supabase/supabase-js'
import { insertFactCheck, getRecentFactChecks, type FactCheck } from '@bipi/db'
import { createLogger } from '@bipi/shared'

const log = createLogger('agents:tavily-oracle')

interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
}

interface TavilyResponse {
  answer: string
  results: TavilySearchResult[]
}

/**
 * TavilyOracle is a persistent, per-debate fact-check and live search service.
 *
 * It runs in two modes:
 *  1. Background: after each exchange it scans the recent transcript and
 *     auto-searches for claims that merit fact-checking.
 *  2. On-demand: any agent or the moderator can call `factCheck(query, agentId)`
 *     to request an immediate search (e.g. "Tavily, check that stat").
 *
 * Results are stored in `debate_fact_checks` and returned to agents as context.
 * The web UI polls the same table to show a live oracle feed to the audience.
 */
export class TavilyOracle {
  private debateId: string
  private db: SupabaseClient
  private apiKey: string | undefined
  private recentFindings: FactCheck[] = []
  private lastBackgroundQuery = ''

  constructor(debateId: string, db: SupabaseClient) {
    this.debateId = debateId
    this.db = db
    this.apiKey = process.env.TAVILY_API_KEY
    if (!this.apiKey) {
      log.warn('TAVILY_API_KEY not set — oracle will operate silently')
    }
  }

  static isConfigured(): boolean {
    return !!process.env.TAVILY_API_KEY
  }

  /**
   * Called after each exchange — scans the last few lines of transcript and
   * searches for the most fact-checkable claim found.
   */
  async backgroundSearch(recentTranscript: string): Promise<FactCheck | null> {
    if (!this.apiKey || !recentTranscript.trim()) return null

    // Extract the most specific factual claim from the last exchange
    const query = this.extractSearchQuery(recentTranscript)
    if (!query || query === this.lastBackgroundQuery) return null

    this.lastBackgroundQuery = query
    log.info(`[Oracle] Background search: "${query}"`)
    return this.search(query, null, null)
  }

  /**
   * Explicit fact-check request — called when an agent or moderator
   * wants to verify a specific claim mid-debate.
   */
  async factCheck(
    query: string,
    triggeredByAgentId: string | null,
    triggeredByTurnId: string | null = null,
  ): Promise<FactCheck | null> {
    if (!this.apiKey) return null
    log.info(`[Oracle] Fact-check request: "${query}" by ${triggeredByAgentId ?? 'oracle'}`)
    return this.search(query, triggeredByAgentId, triggeredByTurnId)
  }

  /**
   * Returns the N most recent findings as a formatted context string
   * for injection into agent prompts.
   */
  getContextForAgents(n = 3): string {
    const recent = this.recentFindings.slice(-n)
    if (recent.length === 0) return ''

    const lines = recent.map((fc) => {
      const topSource = (fc.sources as TavilySearchResult[])[0]
      const sourceNote = topSource ? ` (${topSource.title})` : ''
      return `• [ORACLE] "${fc.query}": ${fc.answer ?? 'No direct answer'}${sourceNote}`
    })

    return `\n[LIVE RESEARCH FEED]\n${lines.join('\n')}\nUse these facts if relevant — do not invent statistics.`
  }

  /**
   * Returns recent findings formatted for the moderator's Q&A decision prompt.
   */
  getContextForModerator(n = 5): string {
    const recent = this.recentFindings.slice(-n)
    if (recent.length === 0) return ''

    const lines = recent.map((fc) =>
      `• "${fc.query}": ${fc.answer?.slice(0, 200) ?? 'No answer'}`,
    )
    return `\n[ORACLE FINDINGS]\n${lines.join('\n')}`
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async search(
    query: string,
    triggeredByAgentId: string | null,
    triggeredByTurnId: string | null,
  ): Promise<FactCheck | null> {
    if (!this.apiKey) return null

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 4,
        }),
      })

      if (!response.ok) {
        log.warn(`Tavily API returned ${response.status} for query: "${query}"`)
        return null
      }

      const data = (await response.json()) as TavilyResponse

      const sources: TavilySearchResult[] = (data.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content.slice(0, 300),
        score: r.score,
      }))

      const factCheck = await insertFactCheck(this.db, {
        debate_id: this.debateId,
        query,
        answer: data.answer ?? null,
        sources,
        triggered_by_agent_id: triggeredByAgentId,
        triggered_by_turn_id: triggeredByTurnId,
      })

      this.recentFindings.push(factCheck)
      // Keep in-memory window small
      if (this.recentFindings.length > 20) {
        this.recentFindings = this.recentFindings.slice(-20)
      }

      return factCheck
    } catch (err) {
      log.error('TavilyOracle search error', err)
      return null
    }
  }

  /**
   * Extracts the most searchable factual claim from recent transcript text.
   * Looks for statistics, named entities, historical claims, policy specifics.
   */
  private extractSearchQuery(transcript: string): string {
    // Take last 500 chars — the most recent content
    const recent = transcript.slice(-500)

    // Prefer sentences with numbers/statistics
    const sentences = recent.split(/[.!?]+/).filter((s) => s.trim().length > 20)
    const statSentence = [...sentences].reverse().find((s) =>
      /\d+(%|billion|trillion|million|thousand|percent|study|data|research|report|according)/i.test(s),
    )
    if (statSentence) return statSentence.trim().slice(0, 150)

    // Fall back to the last substantive sentence
    const lastSentence = [...sentences].reverse().find((s) => s.trim().length > 30)
    return lastSentence?.trim().slice(0, 150) ?? ''
  }

  /**
   * Load any existing fact-checks from DB (useful when resuming a debate).
   */
  async loadExisting(): Promise<void> {
    this.recentFindings = await getRecentFactChecks(this.db, this.debateId, 10)
  }
}
