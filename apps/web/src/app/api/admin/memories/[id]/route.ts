import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { updateMemoryStatus } from '@bipi/db'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !['approved', 'rejected', 'canon'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const db = createServerClient()
    await updateMemoryStatus(db, id, status, 'admin')

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Memory update error:', err)
    return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 })
  }
}
