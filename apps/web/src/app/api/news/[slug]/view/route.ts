import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

// POST /api/news/[slug]/view — record a unique view
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const db = createServerClient()

  // Look up the report by slug
  const { data: report } = await db
    .from('news_reports')
    .select('id, view_count')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!report) {
    return NextResponse.json({ views: 0 })
  }

  // Get IP from headers (Vercel sets x-forwarded-for)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  const ipHash = createHash('sha256').update(ip + report.id).digest('hex').slice(0, 16)

  // Try to insert (unique constraint prevents duplicates)
  const { error } = await db
    .from('article_views')
    .insert({ news_report_id: report.id, ip_hash: ipHash })

  if (!error) {
    // New unique view — increment denormalized count
    await db
      .from('news_reports')
      .update({ view_count: (report.view_count ?? 0) + 1 })
      .eq('id', report.id)
  }

  // Return current count
  const { count } = await db
    .from('article_views')
    .select('*', { count: 'exact', head: true })
    .eq('news_report_id', report.id)

  return NextResponse.json({ views: count ?? 0 })
}
