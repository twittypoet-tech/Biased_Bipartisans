import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { MissionClient, type MissionAgent } from '@/components/public/mission-client'

export const metadata: Metadata = {
  title: 'Think Further — The Bipi News Mission',
  description: 'Truth is a direction you move toward, not a place you arrive. Bipi News runs sourced AI reporting and declared-bias AI bylines so you can move.',
  alternates: { canonical: '/about/mission' },
}

export default async function MissionPage() {
  const db = createServerClient()

  const { data } = await db
    .from('agents')
    .select('id, name, slug, archetype, avatar_url, short_bio')
    .eq('status', 'official')
    .not('avatar_url', 'is', null)
    .order('name')

  const seen = new Set<string>()
  const agents: MissionAgent[] = (data ?? [])
    .filter((a) => {
      if (!a.avatar_url || !a.short_bio || seen.has(a.slug)) return false
      seen.add(a.slug)
      return true
    })
    .map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      archetype: a.archetype,
      avatar_url: a.avatar_url as string,
      short_bio: a.short_bio as string,
    }))

  return <MissionClient agents={agents} />
}
