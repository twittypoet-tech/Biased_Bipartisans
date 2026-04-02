'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Swords, Trophy, Users } from 'lucide-react'
import { useTheme } from './theme-provider'
import { Sun, Moon } from 'lucide-react'
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
      {/* Fade-out gradient above dock */}
      <div className="pointer-events-none h-6 bg-gradient-to-t from-neutral-950 dark:from-neutral-950 to-transparent" />

      <nav className="flex items-center justify-around border-t border-neutral-800 dark:border-neutral-800 bg-neutral-950/95 dark:bg-neutral-950/95 backdrop-blur-lg px-2 pb-[env(safe-area-inset-bottom,8px)] pt-2">
        {dockItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition-all',
                isActive
                  ? 'text-amber-400'
                  : 'text-neutral-500 active:scale-95',
              )}
            >
              <Icon
                className={cn(
                  'size-5 transition',
                  isActive ? 'text-amber-400' : 'text-neutral-500',
                )}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span className={cn(
                'text-[10px] font-medium',
                isActive ? 'text-amber-400' : 'text-neutral-500',
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Theme toggle in dock */}
        <button
          onClick={toggle}
          className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-neutral-500 active:scale-95 transition-all"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="size-5" strokeWidth={1.5} />
          ) : (
            <Moon className="size-5" strokeWidth={1.5} />
          )}
          <span className="text-[10px] font-medium">Theme</span>
        </button>
      </nav>
    </div>
  )
}
