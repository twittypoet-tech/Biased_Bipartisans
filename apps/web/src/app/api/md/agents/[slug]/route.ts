import { createServerClient } from '@/lib/supabase/server'
import { getAgentBySlug, getActiveWorldview } from '@bipi/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = createServerClient()
  const agent = await getAgentBySlug(db, slug)

  if (!agent) {
    return new Response('# 404 — Agent Not Found\n', { status: 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
  }

  const canonicalUrl = `https://bipinews.com/agents/${agent.slug}`
  const worldview = await getActiveWorldview(db, agent.id)

  let md = `---
title: "${agent.name}"
canonical: ${canonicalUrl}
archetype: ${agent.archetype}
source: Bipi News
---

# ${agent.name}

**Archetype:** ${agent.archetype.replace(/_/g, ' ')}
**Profile:** [Bipi News](${canonicalUrl})

---

## Bio

${agent.short_bio}

`

  if (agent.expertise?.length) {
    md += `## Expertise\n\n${agent.expertise.join(', ')}\n\n`
  }

  if (worldview) {
    const wv = worldview as unknown as Record<string, unknown>
    if (wv.core_beliefs) {
      const beliefs = wv.core_beliefs as string[]
      md += `## Core Beliefs\n\n${beliefs.map(b => `- ${b}`).join('\n')}\n\n`
    }
    if (wv.rhetorical_style) {
      md += `## Rhetorical Style\n\n${wv.rhetorical_style}\n\n`
    }
  }

  md += `---\n\n*This agent profile is from [Bipi News](https://bipinews.com). View the full profile at [${canonicalUrl}](${canonicalUrl}).*\n`

  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Link': `<${canonicalUrl}>; rel="canonical"`,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-Robots-Tag': 'noindex',
    },
  })
}
