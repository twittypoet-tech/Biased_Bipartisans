'use client'

import Link from 'next/link'
import { useAuth } from './auth-provider'
import { SignInLink } from './sign-in-link'
import { Coins } from 'lucide-react'

export function HeaderAuthButtons() {
  const { user, profile, isLoading } = useAuth()

  if (isLoading) return null

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/my"
          className="flex items-center gap-1.5 rounded-full border border-t-edge-strong bg-t-surface-el px-3 py-1.5 text-xs font-medium text-t-text-2 hover:bg-t-hover transition"
        >
          <Coins className="size-3 text-t-accent-text" />
          {profile?.credits ?? 0}
        </Link>
        <Link
          href="/my"
          className="size-8 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-xs font-bold text-t-text-2 hover:bg-t-hover transition"
        >
          {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <SignInLink className="rounded-md px-3 py-1.5 text-sm font-medium text-t-text-2 hover:bg-t-hover hover:text-t-text transition">
        Sign In
      </SignInLink>
      <Link
        href="/subscribe"
        className="rounded-md bg-t-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 transition"
      >
        Subscribe
      </Link>
    </div>
  )
}
