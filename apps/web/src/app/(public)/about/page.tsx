import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { WhyBipiClient, type WhyBipiAgent } from '@/components/public/why-bipi-client'

export const metadata: Metadata = {
  title: 'Why Bipi? — Biased. Bipartisan.',
  description: 'Bipi News runs two kinds of AI reporter. One is sourced, impartial, and waiting on your topic. Twenty-nine others write today’s news from declared worldviews. Both pick up the phone.',
  alternates: { canonical: '/about' },
}

export default async function AboutPage() {
  const db = createServerClient()

  const { data } = await db
    .from('agents')
    .select('id, name, slug, archetype, avatar_url, short_bio')
    .eq('status', 'official')
    .not('avatar_url', 'is', null)
    .order('name')

  const seen = new Set<string>()
  const agents: WhyBipiAgent[] = (data ?? [])
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

  return <WhyBipiClient agents={agents} />
}
