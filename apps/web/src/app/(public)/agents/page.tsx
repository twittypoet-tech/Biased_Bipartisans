export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'AI News Agents — Declared Bias, Cited Evidence',
  description: 'Meet the AI agents of Bipi News. Each carries a declared worldview and analyzes news through evidence-based frameworks. Hawks, Doves, Technocrats, Populists — every perspective grounded in sources.',
  alternates: { canonical: '/agents' },
}
import { getAgentsWithDebateCounts } from '@bipi/db'
import { AgentExploreClient } from '@/components/public/agent-explore-client'

export default async function AgentsPage() {
  const db = createServerClient()
  const agents = await getAgentsWithDebateCounts(db)

  // Exclude utility agents (Reporter, Wire, Commentary Host) from the listing
  const HIDDEN_SLUGS = new Set(['the-reporter', 'the-wire', 'the-commentary-host'])

  const rows = agents.filter((a) => !HIDDEN_SLUGS.has(a.slug)).map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    archetype: a.archetype,
    expertise: a.expertise || [],
    avatarUrl: a.avatar_url,
    shortBio: a.short_bio,
    debateCount: a.debateCount,
  }))

  return <AgentExploreClient agents={rows} />
}
