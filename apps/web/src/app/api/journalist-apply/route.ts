import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed } = checkRateLimit(`journalist:${ip}`, 3, 60 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  let body: {
    fullName?: string
    email?: string
    portfolioUrl?: string
    expertise?: string[]
    statement?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const fullName = body.fullName?.trim()
  const email = body.email?.trim()
  if (!fullName || !email) {
    return NextResponse.json({ error: 'Full name and email are required' }, { status: 400 })
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  try {
    const db = createServerClient()
    const { error } = await db.from('journalist_applications').insert({
      full_name: fullName,
      email,
      portfolio_url: body.portfolioUrl?.trim() || null,
      expertise: body.expertise ?? [],
      statement: body.statement?.trim() || null,
    })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('journalist-apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
