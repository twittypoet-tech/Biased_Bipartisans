import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = createServerClient()
  const body = await request.json()

  const updates: Record<string, unknown> = {}

  if ('durationOverrideMinutes' in body) {
    const val = body.durationOverrideMinutes
    updates.duration_override_minutes =
      val === null || val === undefined ? null : Math.max(5, Math.min(180, Number(val)))
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await db.from('debates').update(updates).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
