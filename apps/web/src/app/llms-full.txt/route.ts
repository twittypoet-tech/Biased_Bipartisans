export const dynamic = 'force-dynamic'

export async function GET() {
  const { createServerClient } = await import('@/lib/supabase/server')
  const db = createServerClient()

  // Fetch recent published reports
  const { data: reports } = await db
    .from('news_reports')
    .select('slug, headline, summary, category, published_at, body, sources')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(100)

  const { data: agents } = await db
    .from('agents')
    .select('name, slug, archetype, short_bio, expertise')
    .order('name')

  let content = `# Bipi News — Full Content Index

> The #1 source of Biased News. AI-powered news reporting and debate network.
> Generated: ${new Date().toISOString()}

---

## AI Agents

`

  for (const agent of agents ?? []) {
    content += `### ${agent.name}\n`
    content += `- **Archetype**: ${agent.archetype}\n`
    content += `- **Bio**: ${agent.short_bio}\n`
    if (agent.expertise?.length) content += `- **Expertise**: ${agent.expertise.join(', ')}\n`
    content += `- **Profile**: https://bipinews.com/agents/${agent.slug}\n\n`
  }

  content += `---\n\n## Recent Articles\n\n`

  for (const report of reports ?? []) {
    content += `### ${report.headline}\n`
    content += `- **Category**: ${report.category}\n`
    content += `- **Published**: ${report.published_at}\n`
    content += `- **URL**: https://bipinews.com/news/${report.slug}\n\n`
    if (report.summary) content += `${report.summary}\n\n`

    // Render body blocks as text
    const body = report.body as Array<{ type: string; content?: string }> | null
    if (body) {
      for (const block of body) {
        if (block.content) content += `${block.content}\n\n`
      }
    }

    // Sources
    const sources = report.sources as Array<{ label?: string; url?: string }> | null
    if (sources?.length) {
      content += `**Sources:**\n`
      for (const src of sources) {
        if (src.url) content += `- [${src.label ?? src.url}](${src.url})\n`
      }
      content += `\n`
    }

    content += `---\n\n`
  }

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
