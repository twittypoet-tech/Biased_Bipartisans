import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Bipi News Article'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Fetch report data at the edge
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return fallbackImage('Bipi News')
  }

  const res = await fetch(
    `${supabaseUrl}/rest/v1/news_reports?slug=eq.${slug}&select=headline,category,summary,hero_image_url&limit=1`,
    { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
  )
  const data = await res.json()
  const report = data?.[0]

  if (!report) return fallbackImage('Article Not Found')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '60px',
          background: 'linear-gradient(135deg, #080F22 0%, #0B1E47 50%, #1a0a0a 100%)',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Category pill */}
        {report.category && (
          <div
            style={{
              display: 'flex',
              marginBottom: '20px',
            }}
          >
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#C8A44A',
                textTransform: 'uppercase',
                letterSpacing: '3px',
              }}
            >
              {report.category}
            </span>
          </div>
        )}

        {/* Headline */}
        <div
          style={{
            fontSize: report.headline.length > 80 ? '40px' : '52px',
            fontWeight: 700,
            color: '#f5f5f5',
            lineHeight: 1.15,
            marginBottom: '24px',
            maxWidth: '900px',
            display: '-webkit-box',
            overflow: 'hidden',
          }}
        >
          {report.headline.slice(0, 120)}
        </div>

        {/* Summary */}
        {report.summary && (
          <div
            style={{
              fontSize: '20px',
              color: '#a3a3a3',
              lineHeight: 1.4,
              marginBottom: '40px',
              maxWidth: '800px',
              display: '-webkit-box',
              overflow: 'hidden',
            }}
          >
            {report.summary.slice(0, 150)}
          </div>
        )}

        {/* Bottom bar: brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#C8A44A' }}>BIPI NEWS</span>
            <span style={{ fontSize: '16px', color: '#737373' }}>|</span>
            <span style={{ fontSize: '16px', color: '#737373' }}>The #1 Source of Biased News</span>
          </div>
          <span style={{ fontSize: '14px', color: '#525252' }}>bipinews.com</span>
        </div>
      </div>
    ),
    { ...size }
  )
}

function fallbackImage(title: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#080F22',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '48px', fontWeight: 700, color: '#C8A44A' }}>BIPI NEWS</span>
          <span style={{ fontSize: '24px', color: '#a3a3a3', marginTop: '16px' }}>{title}</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
