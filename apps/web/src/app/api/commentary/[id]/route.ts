import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

// DELETE /api/commentary/[id] — soft-delete (set is_published=false)
// Only the report owner can delete commentary on their report
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: commentaryId } = await params

  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const db = createServerClient()

  // Fetch the commentary to get the parent report
  const { data: commentary } = await db
    .from('report_commentary')
    .select('id, report_call_id')
    .eq('id', commentaryId)
    .single()

  if (!commentary) {
    return NextResponse.json({ error: 'Commentary not found' }, { status: 404 })
  }

  // Verify the user owns the parent report
  const { data: report } = await db
    .from('reporter_calls')
    .select('user_id')
    .eq('id', commentary.report_call_id)
    .single()

  if (!report || report.user_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Soft-delete
  await db
    .from('report_commentary')
    .update({ is_published: false })
    .eq('id', commentaryId)

  return NextResponse.json({ ok: true })
}
