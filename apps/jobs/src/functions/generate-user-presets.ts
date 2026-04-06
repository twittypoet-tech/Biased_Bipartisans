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
                content: `You generate investigative news search queries for a live AI news reporting agent. Today: ${today}

The user has these interests: ${interests.join(', ')}

Generate exactly 8 search queries. Each should:
- Be specific (6-12 words), include names/dates/organizations
- Mix: 2 breaking, 2 investigation, 2 fact-check, 2 discovery
- Map each to the most relevant user interest
- Distribute across ALL interests

Output JSON: { "presets": [{ "title": "short title", "query": "full search query", "interest": "matched interest" }] }`,
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
