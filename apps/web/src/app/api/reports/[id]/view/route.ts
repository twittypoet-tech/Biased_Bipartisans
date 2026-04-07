import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

// POST /api/reports/[id]/view — record a unique view
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await params

  // Get IP from headers (Vercel sets x-forwarded-for)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown'

  // Hash the IP for privacy (don't store raw IPs)
  const ipHash = createHash('sha256').update(ip + reportId).digest('hex').slice(0, 16)

  const db = createServerClient()

  // Try to insert (unique constraint prevents duplicates)
  const { error } = await db
    .from('report_views')
    .insert({ reporter_call_id: reportId, ip_hash: ipHash })

  if (!error) {
    // New unique view — increment denormalized count
    const { data: report } = await db
      .from('reporter_calls')
      .select('view_count')
      .eq('id', reportId)
      .single()

    await db
      .from('reporter_calls')
      .update({ view_count: (report?.view_count ?? 0) + 1 })
      .eq('id', reportId)
  }
  // If error is unique constraint violation, it's a duplicate view — ignore

  // Return current count
  const { count } = await db
    .from('report_views')
    .select('*', { count: 'exact', head: true })
    .eq('reporter_call_id', reportId)

  return NextResponse.json({ views: count ?? 0 })
}
