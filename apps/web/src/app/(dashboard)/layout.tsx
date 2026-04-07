'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FileText, Settings, LogOut, Coins, Menu } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

const sidebarItems = [
  { href: '/my', label: 'Dashboard', icon: Home },
  { href: '/my/reports', label: 'My Reports', icon: FileText },
  { href: '/my/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-t-bg flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-t-edge bg-t-overlay backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-t-text">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bipi-mark.svg" alt="BIPI" className="size-7" />
              Biased Bipartisans
            </Link>
            <span className="hidden sm:inline text-xs text-t-text-4">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-t-edge-strong bg-t-surface-el px-3 py-1.5 text-xs font-medium text-t-text-2">
              <Coins className="size-3 text-t-accent-text" />
              {profile?.credits ?? 0} credits
            </div>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
              profile?.tier === 'pro' ? 'bg-t-accent-soft text-t-accent-text' : 'bg-t-surface-el text-t-text-3',
            )}>
              {profile?.tier ?? 'free'}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-t-edge bg-t-surface p-3 gap-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-t-accent-soft text-t-accent-text' : 'text-t-text-2 hover:bg-t-hover hover:text-t-text',
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
          <div className="flex-1" />
          <Link href="/subscribe" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-t-text-2 hover:bg-t-hover transition">
            <Coins className="size-4" />
            {profile?.tier === 'pro' ? 'Manage Plan' : 'Upgrade to Pro'}
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-t-text-3 hover:bg-t-hover hover:text-t-text-2 transition"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-t-edge bg-t-overlay backdrop-blur-lg">
        <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom,8px)] pt-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href
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
          <Link
            href="/"
            className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-t-text-3 active:scale-95 transition-all"
          >
            <Home className="size-5" strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
