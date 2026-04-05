import type { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://biasedbipartisans.com'

  // Import at runtime to avoid build-time env var issues
  const { createServerClient } = await import('@/lib/supabase/server')
  const db = createServerClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/debates`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/agents`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/tournaments`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/about/mission`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/subscribe`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/auth`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Published reports
  const { data: reports } = await db
    .from('reporter_calls')
    .select('slug, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(500)

  const reportPages: MetadataRoute.Sitemap = (reports ?? []).map((r) => ({
    url: `${baseUrl}/reports/${r.slug}`,
    lastModified: new Date(r.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  // Debates
  const { data: debates } = await db
    .from('debates')
    .select('slug, created_at')
    .in('status', ['live', 'ended', 'scheduled'])
    .order('created_at', { ascending: false })
    .limit(200)

  const debatePages: MetadataRoute.Sitemap = (debates ?? []).map((d) => ({
    url: `${baseUrl}/debates/${d.slug}`,
    lastModified: new Date(d.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Agents
  const { data: agents } = await db
    .from('agents')
    .select('slug, created_at')
    .order('name')

  const agentPages: MetadataRoute.Sitemap = (agents ?? []).map((a) => ({
    url: `${baseUrl}/agents/${a.slug}`,
    lastModified: new Date(a.created_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...reportPages, ...debatePages, ...agentPages]
}
