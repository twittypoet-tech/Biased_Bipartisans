'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, ChevronRight, Mail, HelpCircle, Target, Shield, Newspaper, Building2, Coins, Home, MessageSquare, Swords, Trophy, Users } from 'lucide-react'
import { useAuth } from './auth-provider'

const menuGroups = [
  {
    label: 'Navigate',
    items: [
      { label: 'Home', href: '/', icon: Home },
      { label: 'Commentary', href: '/commentary', icon: MessageSquare },
      { label: 'Debates', href: '/debates', icon: Swords },
      { label: 'Tournaments', href: '/tournaments', icon: Trophy },
      { label: 'Agents', href: '/agents', icon: Users },
    ],
  },
  {
    label: 'About Us',
    items: [
      { label: 'Why Bipi?', href: '/about', icon: HelpCircle },
      { label: 'Our Mission: Think Further', href: '/about/mission', icon: Target },
      { label: 'Our Methodology', href: '/about/methodology', icon: Shield },
    ],
  },
  {
    label: 'Work With Us',
    items: [
      { label: 'Investigative Journalists', href: '/work-with-us/journalists', icon: Newspaper },
      { label: 'Companies and Organizations', href: '/work-with-us/organizations', icon: Building2 },
      { label: 'Contact Us', href: '/contact', icon: Mail },
    ],
  },
  {
    label: 'Buy BIPI',
    items: [
      { label: 'Buy Credits', href: '/subscribe', icon: Coins },
    ],
  },
]

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { user, profile, signOut, isLoading: authLoading } = useAuth()

  // Only render portal after mount (SSR safety)
  useEffect(() => { setMounted(true) }, [])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: 'var(--t-bg)',
          }}
        >
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-t-edge shrink-0">
              <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg font-bold text-t-text tracking-tight">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/bipi-mark.svg" alt="BIPI" className="size-7" />
                Bipi News
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="size-9 rounded-lg flex items-center justify-center text-t-text-2 hover:bg-t-hover transition"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Auth buttons */}
            <div className="px-5 py-5 flex gap-3 shrink-0">
              {authLoading ? (
                <div className="flex-1 h-10" />
              ) : user ? (
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center text-sm font-bold text-t-text-2">
                      {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-t-text">{profile?.display_name ?? 'User'}</p>
                      <p className="text-xs text-t-text-3">{profile?.tier === 'pro' ? 'Pro' : 'Free'} · {profile?.credits ?? 0} credits</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/my"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 rounded-lg bg-t-accent px-4 py-2.5 text-sm font-semibold text-white text-center hover:opacity-90 transition"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { signOut(); setIsOpen(false) }}
                      className="rounded-lg border border-t-edge-strong bg-t-surface-el px-4 py-2.5 text-sm font-medium text-t-text-2 hover:bg-t-hover transition"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link
                    href="/auth"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-lg border border-t-edge-strong bg-t-surface-el px-4 py-3 text-sm font-semibold text-t-text text-center hover:bg-t-hover transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/subscribe"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 rounded-lg bg-t-accent px-4 py-3 text-sm font-semibold text-white text-center hover:opacity-90 transition"
                  >
                    Subscribe
                  </Link>
                </>
              )}
            </div>

            {/* Menu groups */}
            <div className="flex-1 px-5 pb-10">
              {menuGroups.map((group) => (
                <div key={group.label} className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3 mb-2 px-1">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-t-text hover:bg-t-hover transition"
                        >
                          <Icon className="size-5 text-t-text-3 shrink-0" />
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          <ChevronRight className="size-4 text-t-text-4" />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="size-9 rounded-lg flex items-center justify-center text-t-text-2 hover:bg-t-hover transition"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Render menu via portal at document.body level to escape all stacking contexts */}
      {mounted && createPortal(menuContent, document.body)}
    </>
  )
}
