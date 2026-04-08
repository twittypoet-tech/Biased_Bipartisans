export const dynamic = 'force-dynamic'

import { createServerClient, createAuthServerClient } from '@/lib/supabase/server'
import { listActiveReporterPresets, listAgents, listUserPresets } from '@bipi/db'
import { CallHero } from '@/components/home/call-hero'
import { DashboardWelcome } from './dashboard-welcome'

export default async function DashboardHome() {
  const db = createServerClient()

  // Get user for presets
  let userId: string | null = null
  try {
    const authClient = await createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    userId = user?.id ?? null
  } catch {}

  const [presets, allAgents, userPresets] = await Promise.all([
    listActiveReporterPresets(db),
    listAgents(db),
    userId ? listUserPresets(db, userId) : Promise.resolve([]),
  ])

  // Only The Reporter in agent selector
  const agentOptions = allAgents
    .filter((a) => a.slug === 'the-reporter')
    .map((a) => ({
      id: a.id,
      name: a.name,
      avatarUrl: a.avatar_url,
      available: true,
      shortBio: a.short_bio ?? '',
    }))

  return (
    <div className="bg-t-bg">
      <DashboardWelcome />
      <CallHero presets={presets} agents={agentOptions} userPresets={userPresets} />
    </div>
  )
}
