import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

// DELETE /api/reporter/[id] — permanently delete a report
// Only the report creator can delete their own report
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await params

  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  }

  const db = createServerClient()

  // Verify ownership
  const { data: report } = await db
    .from('reporter_calls')
    .select('id, user_id')
    .eq('id', reportId)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (report.user_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Delete the report (cascades to commentary, comments, votes, etc.)
  const { error } = await db
    .from('reporter_calls')
    .delete()
    .eq('id', reportId)

  if (error) {
    console.error('Report delete error:', error)
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
