import OpenAI from 'openai'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface GeneratedPreset {
  title: string
  query: string
  interest: string
}

/**
 * Generate 8 personalized reporter presets for a user based on their interests.
 * Uses GPT-4o-mini for cost efficiency (~$0.0003/call).
 * Stores results in user_presets table, replacing any existing presets.
 */
export async function generateUserPresets(
  db: SupabaseClient,
  userId: string,
  interests: string[],
): Promise<GeneratedPreset[]> {
  if (interests.length === 0) return []

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')

  const openai = new OpenAI({ apiKey: openaiKey })

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.8,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You generate investigative news search queries for a live AI news reporting agent called "The Reporter" on the Biased Bipartisans platform. The Reporter searches the web in real-time using Bright Data and delivers sourced news reports.

Today's date: ${today}

The user has these interests: ${interests.join(', ')}

Generate exactly 8 search queries optimized for a live news agent. Each query should:
- Be specific enough to return actionable, current results (6-12 words works best)
- Include context clues: names, dates, organizations, or specific events
- Cover a balanced mix across query types:
  • 2 BREAKING: What's happening right now? Latest developments, breaking stories
  • 2 INVESTIGATION: Deep dives, hidden connections, follow the money
  • 2 FACT-CHECK: Verify claims, confirm or debunk, compare official vs reported
  • 2 DISCOVERY: Emerging trends, under-reported stories, what's being missed
- Map each query to the most relevant user interest
- Distribute queries across ALL the user's interests (don't cluster on one)
- Write titles as compelling 3-6 word hooks

Output JSON: { "presets": [{ "title": "compelling short title", "query": "the full search query for the reporter agent", "interest": "matched interest from the user's list" }] }`,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty GPT response')

  const parsed = JSON.parse(content)
  const presets: GeneratedPreset[] = Array.isArray(parsed.presets) ? parsed.presets : []

  if (presets.length === 0) return []

  // Deactivate old presets
  await db
    .from('user_presets')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)

  // Insert new presets
  const rows = presets.slice(0, 8).map((p, i) => ({
    user_id: userId,
    title: p.title,
    query_template: p.query,
    interest: p.interest,
    sort_order: i,
    is_active: true,
  }))

  await db.from('user_presets').insert(rows)

  return presets.slice(0, 8)
}
