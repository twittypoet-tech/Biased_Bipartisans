import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(request: Request) {
  // Rate limit: 5 submissions per hour per IP
  const ip = getClientIp(request)
  const { allowed } = checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })

  let body: { name?: string; email?: string; reason?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = body.name?.trim()
  const email = body.email?.trim()
  const reason = body.reason?.trim()
  const message = body.message?.trim()

  if (!name || !email || !reason || !message) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  try {
    const db = createServerClient()
    const { error } = await db.from('contact_messages').insert({ name, email, reason, message })
    if (error) throw error

    // Send notification email via Brevo
    const brevoKey = process.env.BREVO_API_KEY
    if (brevoKey) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'BIPI Contact Form', email: 'noreply@biasedbipartisans.com' },
          to: [{ email: 'contact@biasedbipartisans.com', name: 'Biased Bipartisans' }],
          replyTo: { email, name },
          subject: `[BIPI Contact] ${escapeHtml(reason)}`,
          htmlContent: `
            <h2>${escapeHtml(reason)}</h2>
            <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
            <hr>
            <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
          `,
        }),
      }).catch((err) => console.error('Brevo email error:', err))
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
