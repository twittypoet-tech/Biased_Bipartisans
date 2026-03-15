import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

/**
 * Polling endpoint for live debate turns when LiveKit isn't available.
 * Returns new turns after a given turn index.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const debateId = searchParams.get('debateId')
  const afterStr = searchParams.get('after')

  if (!debateId) {
    return NextResponse.json({ error: 'Missing debateId' }, { status: 400 })
  }

  const afterIndex = afterStr ? parseInt(afterStr, 10) : 0
  const db = createServerClient()

  const { data: turns, error } = await db
    .from('debate_turns')
    .select('*, agents:speaker_id(name, archetype)')
    .eq('debate_id', debateId)
    .gte('turn_index', afterIndex)
    .order('turn_index', { ascending: true })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch turns' }, { status: 500 })
  }

  const result = (turns ?? []).map((t) => {
    const agent = (t as unknown as Record<string, unknown>).agents as Record<string, unknown> | null
    return {
      id: t.id,
      speakerName: (agent?.name as string) ?? 'Unknown',
      speakerId: t.speaker_id,
      archetype: (agent?.archetype as string) ?? 'unknown',
      roundPhase: t.round_phase,
      turnIndex: t.turn_index,
      transcript: t.transcript,
      isModerator: t.speaker_type === 'moderator',
      audioUrl: t.audio_url ?? null,
    }
  })

  return NextResponse.json(result)
}
