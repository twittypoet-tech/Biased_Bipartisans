export const dynamic = 'force-dynamic'

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export async function GET() {
  const { createServerClient } = await import('@/lib/supabase/server')
  const db = createServerClient()

  // Google News sitemap: articles from last 2 days
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()

  const { data: reports } = await db
    .from('news_reports')
    .select('slug, headline, published_at, category')
    .eq('is_published', true)
    .gte('published_at', twoDaysAgo)
    .order('published_at', { ascending: false })
    .limit(1000)

  const { data: reporterCalls } = await db
    .from('reporter_calls')
    .select('slug, report_headline, created_at, report_category')
    .eq('is_published', true)
    .gte('created_at', twoDaysAgo)
    .order('created_at', { ascending: false })
    .limit(500)

  const newsEntries = (reports ?? []).map(r => `
  <url>
    <loc>https://bipinews.com/news/${r.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Bipi News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${r.published_at}</news:publication_date>
      <news:title>${escapeXml(r.headline)}</news:title>
    </news:news>
  </url>`).join('')

  const reportEntries = (reporterCalls ?? []).filter(r => r.slug && r.report_headline).map(r => `
  <url>
    <loc>https://bipinews.com/reports/${r.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Bipi News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${r.created_at}</news:publication_date>
      <news:title>${escapeXml(r.report_headline!)}</news:title>
    </news:news>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${newsEntries}${reportEntries}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  })
}
