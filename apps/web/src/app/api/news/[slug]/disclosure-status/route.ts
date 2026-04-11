import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

// ── IP hashing (mirrors apps/web/src/app/api/news/[slug]/view/route.ts:25-28) ─

function hashIpForReport(request: Request, reportId: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  return createHash('sha256').update(ip + reportId).digest('hex').slice(0, 16)
}

async function resolveReportId(
  db: ReturnType<typeof createServerClient>,
  slug: string,
): Promise<string | null> {
  const { data } = await db
    .from('news_reports')
    .select('id')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()
  return data?.id ?? null
}

// ── GET /api/news/[slug]/disclosure-status ────────────────────────────────────
// Returns { shouldShow: boolean }. The popup hits this once per article on
// first visit, after the localStorage fast-path misses. Auth-agnostic — the
// caller has already gated for logged-out users.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const db = createServerClient()

  const reportId = await resolveReportId(db, slug)
  if (!reportId) {
    return NextResponse.json({ shouldShow: false })
  }

  const ipHash = hashIpForReport(request, reportId)

  const { data: existing } = await db
    .from('article_disclosure_dismissals')
    .select('id')
    .eq('news_report_id', reportId)
    .eq('ip_hash', ipHash)
    .maybeSingle()

  return NextResponse.json({ shouldShow: !existing })
}

// ── POST /api/news/[slug]/disclosure-status ───────────────────────────────────
// Marks this (article, ip) as having seen the popup. Idempotent — the unique
// constraint will reject duplicates and we swallow that as success.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const db = createServerClient()

  const reportId = await resolveReportId(db, slug)
  if (!reportId) {
    return NextResponse.json({ ok: false }, { status: 404 })
  }

  const ipHash = hashIpForReport(request, reportId)

  const { error } = await db
    .from('article_disclosure_dismissals')
    .insert({ news_report_id: reportId, ip_hash: ipHash })

  // Unique-violation (23505) means another tab/request already recorded it —
  // that's the desired idempotent outcome, not a failure.
  if (error && error.code !== '23505') {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
