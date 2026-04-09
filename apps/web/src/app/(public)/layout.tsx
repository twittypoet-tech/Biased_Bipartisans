import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileDock } from '@/components/mobile-dock'
import { SiteFooter } from '@/components/footer'
import { HamburgerMenu } from '@/components/hamburger-menu'
import { HeaderAuthButtons } from '@/components/header-auth-buttons'
import { CategoryNav } from '@/components/category-nav'
import { InAppBrowserBanner } from '@/components/public/in-app-browser-banner'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Tier 1: Brand bar ── */}
      <header className="sticky top-0 z-50 border-b border-t-edge bg-t-overlay backdrop-blur-md">
        {/* Desktop */}
        <div className="hidden md:flex mx-auto h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bipi-mark.svg" alt="BIPI" className="size-7" />
            <span className="text-lg font-bold tracking-tight text-t-text">BiPi</span>
          </Link>
          <div className="flex items-center gap-1">
            <HeaderAuthButtons />
            <ThemeToggle />
            <HamburgerMenu />
          </div>
        </div>
        {/* Mobile */}
        <div className="flex md:hidden h-12 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bipi-mark.svg" alt="BIPI" className="size-6" />
            <span className="text-sm font-bold tracking-tight text-t-text">BiPi</span>
          </Link>
          <HamburgerMenu />
        </div>
      </header>

      {/* ── Tier 2: Category navigation bar ── */}
      <CategoryNav />

      {/* ── In-app browser banner (Reddit, Instagram, etc.) ── */}
      <InAppBrowserBanner />

      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <SiteFooter />

      <MobileDock />
    </div>
  )
}
