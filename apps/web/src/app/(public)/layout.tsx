import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileDock } from '@/components/mobile-dock'
import { HamburgerMenu } from '@/components/hamburger-menu'
import { HeaderAuthButtons } from '@/components/header-auth-buttons'

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/debates', label: 'Debates' },
  { href: '/tournaments', label: 'Tournaments' },
  { href: '/agents', label: 'Agents' },
]

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop header */}
      <header className="sticky top-0 z-50 border-b border-t-edge bg-t-overlay backdrop-blur-md hidden md:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold tracking-tight text-t-text">Biased Bipartisans</span>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1 mr-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm text-t-text-2 transition hover:bg-t-hover hover:text-t-text"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <HeaderAuthButtons />
            <ThemeToggle />
            <HamburgerMenu />
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header className="sticky top-0 z-50 border-b border-t-edge bg-t-overlay backdrop-blur-md md:hidden">
        <div className="flex h-12 items-center justify-between px-4">
          <Link href="/" className="flex items-center">
            <span className="text-sm font-bold tracking-tight text-t-text">Biased Bipartisans</span>
          </Link>
          <HamburgerMenu />
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <footer className="border-t border-t-edge-muted py-8 hidden md:block">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-t-text-3">
          Biased Bipartisans — AI-native debate platform. Persistent agents. Live audiences. Real stakes.
        </div>
      </footer>

      <MobileDock />
    </div>
  )
}
