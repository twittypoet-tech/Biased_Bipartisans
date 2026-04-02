'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Swords, Trophy, Users, Sun, Moon } from 'lucide-react'
import { useTheme } from './theme-provider'
import { cn } from '@/lib/utils'

const dockItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/debates', icon: Swords, label: 'Debates' },
  { href: '/tournaments', icon: Trophy, label: 'Tourneys' },
  { href: '/agents', icon: Users, label: 'Agents' },
]

export function MobileDock() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="pointer-events-none h-6" style={{ background: `linear-gradient(to top, var(--t-bg), transparent)` }} />

      <nav className="flex items-center justify-around border-t border-t-edge bg-t-overlay backdrop-blur-lg px-2 pb-[env(safe-area-inset-bottom,8px)] pt-2">
        {dockItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all',
                isActive ? 'text-t-accent-text' : 'text-t-text-3 active:scale-95',
              )}
            >
              <Icon className="size-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        <button
          onClick={toggle}
          className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-t-text-3 active:scale-95 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="size-5" strokeWidth={1.5} /> : <Moon className="size-5" strokeWidth={1.5} />}
          <span className="text-[10px] font-medium">Theme</span>
        </button>
      </nav>
    </div>
  )
}
