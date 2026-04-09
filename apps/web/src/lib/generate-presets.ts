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
        content: `You generate detailed, instructive research prompts for a live AI news reporting agent called "The Reporter" on the Bipi News platform. The Reporter searches the web in real-time, verifies sources, and delivers comprehensive sourced news reports.

Today's date: ${today}

The user has these interests: ${interests.join(', ')}

CRITICAL: Each query must be a DETAILED INSTRUCTION to the reporter agent — NOT a short keyword search. The query tells the agent exactly what to investigate, what angles to cover, and what evidence to look for.

GOOD EXAMPLE queries (follow this style):
- "Give me an in depth report on everything we know about Jeffrey Epstein's Zorro Ranch, including ownership records, known visitors, and any connections to intelligence agencies."
- "Provide a detailed report of the CIA MK Ultra Program, covering its origins, key experiments, institutional oversight failures, and long-term consequences on policy and public trust."
- "Analyze current data on democratic instability in the United States, including institutional erosion indicators, public trust metrics, and comparisons to historical democratic backsliding patterns."

BAD EXAMPLE queries (DO NOT do this):
- "latest US Iran tensions April 2026" (too short, no instruction)
- "current CIA operations controversies" (vague keyword dump)

Generate exactly 8 queries. Each query MUST:
- Be 1-2 full sentences that instruct the reporter what to investigate
- Specify what aspects to cover (origins, key players, evidence, implications, comparisons)
- Request specific types of evidence (records, data, testimony, declassified documents, metrics)
- Be grounded in the user's interests but explore specific, concrete subtopics within them
- Cover a balanced mix: 2 current developments, 2 deep investigations, 2 fact-checks/verifications, 2 emerging/discovery

Titles should be compelling 3-6 word hooks.

Output JSON: { "presets": [{ "title": "compelling short title", "query": "the full detailed instruction for the reporter agent", "interest": "matched interest from the user's list" }] }`,
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
