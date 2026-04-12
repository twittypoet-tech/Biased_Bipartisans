'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { ComponentProps, ReactNode } from 'react'

/**
 * SignInLink
 *
 * Wraps next/link for any "Sign In" CTA. Captures the current pathname (and
 * preserves any search params) and hands it to /auth as a ?redirect= so the
 * auth flow bounces the user back to where they were instead of the default
 * /my dashboard.
 *
 * Replaces every hardcoded <Link href="/auth"> / <a href="/auth">.
 *
 * Safe to call from anywhere — pathname falls back to /my if unavailable,
 * which matches the legacy default.
 */

type Props = Omit<ComponentProps<typeof Link>, 'href'> & {
  children: ReactNode
  /** Override the computed redirect target. Rarely needed. */
  redirectTo?: string
}

export function SignInLink({ children, redirectTo, ...props }: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const fallback = '/my'
  const rawPath = redirectTo ?? pathname ?? fallback

  // Don't round-trip a redirect to /auth itself — that would loop.
  const base = rawPath.startsWith('/auth') ? fallback : rawPath

  // Preserve any search params the user had on the current page
  const qs = searchParams?.toString()
  const fullPath = qs ? `${base}?${qs}` : base

  const href = `/auth?redirect=${encodeURIComponent(fullPath)}`

  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  )
}
