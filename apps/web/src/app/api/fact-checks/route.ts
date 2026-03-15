import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getDebateFactChecks } from '@bipi/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const debateId = searchParams.get('debateId')

  if (!debateId) {
    return NextResponse.json({ error: 'debateId required' }, { status: 400 })
  }

  const db = createServerClient()
  const factChecks = await getDebateFactChecks(db, debateId, 20)

  return NextResponse.json(factChecks)
}
