import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateDebateSlug, generateRoomName } from '@bipi/agent-core'

export async function POST(request: Request) {
  const db = createServerClient()
  const body = await request.json()

  const { title, topicFraming, formatId, scheduledAt, durationOverrideMinutes } = body

  const slug = generateDebateSlug(title)
  const roomName = generateRoomName(slug)

  const { data, error } = await db
    .from('debates')
    .insert({
      title,
      slug,
      topic_framing: topicFraming,
      format_id: formatId,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduled_at: scheduledAt || null,
      room_name: roomName,
      duration_override_minutes: durationOverrideMinutes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('Create debate error:', error)
    return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 400 })
  }

  return NextResponse.json({ id: data.id, slug: data.slug })
}
