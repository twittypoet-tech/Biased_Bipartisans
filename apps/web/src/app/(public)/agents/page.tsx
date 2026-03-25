export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getAgentsWithDebateCounts } from '@bipi/db'
import { AgentExploreClient } from '@/components/public/agent-explore-client'

export default async function AgentsPage() {
  const db = createServerClient()
  const agents = await getAgentsWithDebateCounts(db)

  const rows = agents.map((a) => ({
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
