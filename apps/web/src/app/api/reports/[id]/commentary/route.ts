import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { listReportCommentary } from '@bipi/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = createServerClient()
  const commentary = await listReportCommentary(db, id)
  return NextResponse.json({ commentary })
}
