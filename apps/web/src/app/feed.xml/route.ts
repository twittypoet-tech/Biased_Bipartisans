export const dynamic = 'force-dynamic'

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export async function GET() {
  const { createServerClient } = await import('@/lib/supabase/server')
  const db = createServerClient()

  const { data: reports } = await db
    .from('news_reports')
    .select('slug, headline, summary, published_at, category, hero_image_url')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(50)

  const { data: reporterCalls } = await db
    .from('reporter_calls')
    .select('slug, report_headline, call_summary, created_at, report_category, report_image_url')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(50)

  const newsItems = (reports ?? []).map(r => `
    <item>
      <title>${escapeXml(r.headline)}</title>
      <link>https://bipinews.com/news/${r.slug}</link>
      <description>${escapeXml(r.summary ?? '')}</description>
      <pubDate>${new Date(r.published_at).toUTCString()}</pubDate>
      <category>${escapeXml(r.category)}</category>
      <guid isPermaLink="true">https://bipinews.com/news/${r.slug}</guid>
    </item>`).join('')

  const reportItems = (reporterCalls ?? []).filter(r => r.slug && r.report_headline).map(r => `
    <item>
      <title>${escapeXml(r.report_headline!)}</title>
      <link>https://bipinews.com/reports/${r.slug}</link>
      <description>${escapeXml(r.call_summary ?? '')}</description>
      <pubDate>${new Date(r.created_at).toUTCString()}</pubDate>
      ${r.report_category ? `<category>${escapeXml(r.report_category)}</category>` : ''}
      <guid isPermaLink="true">https://bipinews.com/reports/${r.slug}</guid>
    </item>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Bipi News</title>
    <link>https://bipinews.com</link>
    <description>The #1 source of Biased News. AI-powered news reports and multi-perspective analysis.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://bipinews.com/feed.xml" rel="self" type="application/rss+xml"/>
    ${newsItems}${reportItems}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
