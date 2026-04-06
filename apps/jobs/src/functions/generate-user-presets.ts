import { inngest } from '../inngest/client.js'
import { getSupabaseClient } from '@bipi/db'
import OpenAI from 'openai'

// ── Daily personalized preset generation ────────────────────────────────────
// Runs daily at 6am UTC. For each user with interests, generates 8
// personalized reporter search presets via GPT-4o-mini.

export const dailyPresetGeneration = inngest.createFunction(
  { id: 'generate-user-presets', name: 'Daily User Preset Generation' },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    const result = await step.run('generate-presets', async () => {
      const db = getSupabaseClient()

      // Fetch users with interests
      const { data: users, error } = await db
        .from('user_profiles')
        .select('id, interests')
        .not('interests', 'eq', '{}')

      if (error) throw error
      if (!users?.length) return { generated: 0, total: 0 }

      const openaiKey = process.env.OPENAI_API_KEY
      if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')

      const openai = new OpenAI({ apiKey: openaiKey })

      const today = new Date().toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })

      let generated = 0

      for (const user of users) {
        const interests = (user.interests as string[]).filter(Boolean)
        if (interests.length === 0) continue

        try {
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.8,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You generate detailed, instructive research prompts for a live AI news reporting agent called "The Reporter". The Reporter searches the web in real-time, verifies sources, and delivers comprehensive sourced news reports. Today: ${today}

The user has these interests: ${interests.join(', ')}

CRITICAL: Each query must be a DETAILED INSTRUCTION — NOT a short keyword search. Tell the agent exactly what to investigate, what angles to cover, and what evidence to look for.

GOOD: "Give me an in depth report on everything we know about Jeffrey Epstein's Zorro Ranch, including ownership records, known visitors, and any connections to intelligence agencies."
BAD: "latest Epstein news 2026" (too short, no instruction)

Generate exactly 8 queries. Each MUST be 1-2 full instructive sentences specifying aspects to cover and evidence to find. Mix: 2 current developments, 2 deep investigations, 2 fact-checks, 2 emerging/discovery. Titles: 3-6 word hooks.

Output JSON: { "presets": [{ "title": "short title", "query": "full detailed instruction", "interest": "matched interest" }] }`,
              },
            ],
          })

          const content = response.choices[0]?.message?.content
          if (!content) continue

          const parsed = JSON.parse(content)
          const presets = Array.isArray(parsed.presets) ? parsed.presets : []
          if (presets.length === 0) continue

          // Deactivate old presets
          await db
            .from('user_presets')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .eq('is_active', true)

          // Insert new
          await db.from('user_presets').insert(
            presets.slice(0, 8).map((p: { title: string; query: string; interest: string }, i: number) => ({
              user_id: user.id,
              title: p.title,
              query_template: p.query,
              interest: p.interest,
              sort_order: i,
              is_active: true,
            })),
          )

          generated++
        } catch (err) {
          console.error('Preset generation failed for user', user.id, err)
        }
      }

      return { generated, total: users.length }
    })

    return result
  },
)
