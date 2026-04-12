'use server'

/**
 * Auth server actions.
 *
 * verifyOtp runs SERVER-SIDE via @supabase/ssr's server client. That client
 * writes the session cookies through Next.js response headers, not through
 * document.cookie, so the cookies are guaranteed to be in place the instant
 * the next request hits the server. No timing games, no onAuthStateChange,
 * no hard-navigate timeout.
 *
 * This replaces the previous client-side supabase.auth.verifyOtp call that
 * had a race between document.cookie writes and middleware reads, which was
 * causing post-login bounces back to /auth.
 */

import { redirect } from 'next/navigation'
import { createAuthServerClient } from '@/lib/supabase/server'

export interface VerifyOtpResult {
  ok: boolean
  error?: string
}

/**
 * Validate redirect target. Only same-origin relative paths. Falls back to
 * /my for anything else (absolute URLs, protocol-relative, path-escape).
 */
function safeRedirect(raw: string | null | undefined): string {
  if (!raw) return '/my'
  if (!raw.startsWith('/')) return '/my'
  if (raw.startsWith('//')) return '/my'
  if (raw.startsWith('/\\')) return '/my'
  return raw
}

export async function verifyOtpAction(
  email: string,
  token: string,
  redirectParam: string | null | undefined,
): Promise<VerifyOtpResult> {
  const cleanEmail = email.trim().toLowerCase()
  const cleanToken = token.trim()

  if (!cleanEmail || cleanToken.length !== 6) {
    return { ok: false, error: 'Invalid email or code.' }
  }

  const supabase = await createAuthServerClient()

  const { error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: 'email',
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  // Success: the SSR client has already written the session cookies into the
  // response. redirect() from next/navigation throws a special error that
  // Next.js catches and converts into a 303 with the Set-Cookie headers
  // intact, so the browser follows the redirect with the new session
  // already attached.
  const target = safeRedirect(redirectParam)
  redirect(target)
}

export async function sendOtpAction(
  email: string,
): Promise<VerifyOtpResult> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) {
    return { ok: false, error: 'Email required.' }
  }

  const supabase = await createAuthServerClient()

  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: { shouldCreateUser: true },
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
