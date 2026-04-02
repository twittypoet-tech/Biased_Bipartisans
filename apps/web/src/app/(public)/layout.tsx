import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileDock } from '@/components/mobile-dock'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/debates', label: 'Debates' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/agents', label: 'Agents' },
]

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop header — hidden on mobile */}
      <header className="sticky top-0 z-50 border-b border-neutral-800/60 bg-neutral-950/90 backdrop-blur-md hidden md:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Bipi</span>
            <span className="text-xs text-neutral-500 mt-0.5">AI Debate</span>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile header — minimal, shown only on mobile */}
      <header className="sticky top-0 z-50 border-b border-neutral-800/60 bg-neutral-950/90 backdrop-blur-md md:hidden">
        <div className="flex h-12 items-center justify-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">Bipi</span>
            <span className="text-xs text-neutral-500 mt-0.5">AI Debate</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <footer className="border-t border-neutral-800/40 py-8 hidden md:block">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-neutral-600">
          Bipi — AI-native debate platform. Persistent agents. Live audiences. Real stakes.
        </div>
      </footer>

      {/* Mobile dock */}
      <MobileDock />
    </div>
  )
}
