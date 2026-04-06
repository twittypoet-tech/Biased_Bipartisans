import { inngest } from '../inngest/client.js'
import { getSupabaseClient } from '@bipi/db'

const MAX_FREE_CREDITS = 50 // Cap free user credit accumulation

// ── Weekly credit refill for free users ─────────────────────────────────────
// Runs every Monday at midnight UTC
// Adds 5 credits, capped at MAX_FREE_CREDITS

export const weeklyFreeRefill = inngest.createFunction(
  { id: 'credit-refill-weekly', name: 'Weekly Free Credit Refill' },
  { cron: '0 0 * * 1' },
  async ({ step }) => {
    const result = await step.run('refill-free-users', async () => {
      const db = getSupabaseClient()

      // Fetch all free-tier users
      const { data: users, error } = await db
        .from('user_profiles')
        .select('id, credits')
        .eq('tier', 'free')

      if (error) throw error
      if (!users?.length) return { updated: 0 }

      let updated = 0
      for (const user of users) {
        const newCredits = Math.min((user.credits ?? 0) + 5, MAX_FREE_CREDITS)
        if (newCredits === user.credits) continue // Already at cap

        await db
          .from('user_profiles')
          .update({ credits: newCredits, credits_updated_at: new Date().toISOString() })
          .eq('id', user.id)

        await db.from('credit_transactions').insert({
          user_id: user.id,
          amount: newCredits - (user.credits ?? 0),
          reason: 'weekly_free',
        })

        updated++
      }

      return { updated, total: users.length }
    })

    return result
  },
)

// ── Monthly credit reset for pro users ──────────────────────────────────────
// Runs on the 1st of each month at midnight UTC
// Resets pro users to 100 credits

export const monthlyProRefill = inngest.createFunction(
  { id: 'credit-refill-monthly', name: 'Monthly Pro Credit Refill' },
  { cron: '0 0 1 * *' },
  async ({ step }) => {
    const result = await step.run('refill-pro-users', async () => {
      const db = getSupabaseClient()

      // Fetch all pro-tier users
      const { data: users, error } = await db
        .from('user_profiles')
        .select('id, credits')
        .eq('tier', 'pro')

      if (error) throw error
      if (!users?.length) return { updated: 0 }

      let updated = 0
      for (const user of users) {
        await db
          .from('user_profiles')
          .update({ credits: 100, credits_updated_at: new Date().toISOString() })
          .eq('id', user.id)

        await db.from('credit_transactions').insert({
          user_id: user.id,
          amount: 100,
          reason: 'monthly_pro',
        })

        updated++
      }

      return { updated, total: users.length }
    })

    return result
  },
)
