import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { MethodologyClient, type MethodologyAgent } from '@/components/public/methodology-client'

export const metadata: Metadata = {
  title: 'These Articles Answer Back — Bipi News Methodology',
  description: 'How Bipi News writes its stories with declared-bias AI reporters and lets readers phone the byline live. Sourced citations, named worldviews, real conversations.',
  alternates: { canonical: '/about/methodology' },
}

export default async function MethodologyPage() {
  const db = createServerClient()

  const { data } = await db
    .from('agents')
    .select('id, name, slug, archetype, avatar_url, short_bio')
    .eq('status', 'official')
    .not('avatar_url', 'is', null)
    .order('name')

  const seen = new Set<string>()
  const agents: MethodologyAgent[] = (data ?? [])
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

  return <MethodologyClient agents={agents} />
}
