import type { MetadataRoute } from 'next'

export const revalidate = 21600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://bipinews.com'

  // Import at runtime to avoid build-time env var issues
  const { createServerClient } = await import('@/lib/supabase/server')
  const db = createServerClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/debates`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/agents`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/tournaments`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/playlists`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/about/mission`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/about/methodology`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/commentary`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/work-with-us/journalists`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/work-with-us/organizations`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/subscribe`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Published news reports (with updated_at for lastModified)
  const { data: newsReports } = await db
    .from('news_reports')
    .select('slug, published_at, updated_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(1000)

  const newsPages: MetadataRoute.Sitemap = (newsReports ?? []).map((r) => ({
    url: `${baseUrl}/news/${r.slug}`,
    lastModified: new Date(r.updated_at ?? r.published_at),
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  // Reporter calls
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

  // Tournaments
  const { data: tournaments } = await db
    .from('tournaments')
    .select('slug, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const tournamentPages: MetadataRoute.Sitemap = (tournaments ?? []).map((t) => ({
    url: `${baseUrl}/tournaments/${t.slug}`,
    lastModified: new Date(t.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...newsPages, ...reportPages, ...debatePages, ...agentPages, ...tournamentPages]
}
