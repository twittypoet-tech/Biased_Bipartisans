import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'

// GET /api/reporter/votes?callIds=id1,id2,id3
// Returns the user's votes for the given report call IDs
export async function GET(request: Request) {
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ votes: {} })
  }

  const url = new URL(request.url)
  const callIds = url.searchParams.get('callIds')?.split(',').filter(Boolean) ?? []

  if (callIds.length === 0) {
    return NextResponse.json({ votes: {} })
  }

  const db = createServerClient()
  const { data } = await db
    .from('reporter_call_votes')
    .select('reporter_call_id, direction')
    .eq('user_id', user.id)
    .in('reporter_call_id', callIds)

  const votes: Record<string, 'up' | 'down'> = {}
  for (const v of data ?? []) {
    votes[v.reporter_call_id] = v.direction as 'up' | 'down'
  }

  return NextResponse.json({ votes })
}
