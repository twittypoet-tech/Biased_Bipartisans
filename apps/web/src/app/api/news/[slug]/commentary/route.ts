import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getReportBySlug, listAgentCommentary } from '@bipi/db'

// GET /api/news/[slug]/commentary
// Returns the current published commentary list for a news article. Used by
// news-article-client to poll after a fresh request has been submitted.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const db = createServerClient()

  const report = await getReportBySlug(db, slug)
  if (!report) {
    return NextResponse.json({ commentary: [] }, { status: 404 })
  }

  const commentary = await listAgentCommentary(db, report.id)
  return NextResponse.json({ commentary })
}
