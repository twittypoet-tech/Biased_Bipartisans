'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/debates', label: 'Debates' },
  { href: '/admin/evaluations', label: 'Evaluations' },
  { href: '/admin/memories', label: 'Memories' },
]

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function AdminNav() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const navLinks = navItems.map((item) => {
    const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={`block rounded-md px-3 py-2 text-sm transition hover:bg-neutral-800 hover:text-white ${
          isActive ? 'bg-neutral-800 text-white' : 'text-neutral-400'
        }`}
      >
        {item.label}
      </Link>
    )
  })

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r border-neutral-800 bg-neutral-950 transition-all duration-200 ${
          collapsed ? 'w-14' : 'w-56'
        }`}
      >
        <div className={`flex flex-col flex-1 ${collapsed ? 'p-2' : 'p-4'}`}>
          {/* Header row */}
          <div className={`mb-6 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <Link href="/admin" className="block min-w-0">
                <h2 className="text-lg font-bold tracking-tight truncate">Bipi Admin</h2>
                <p className="text-xs text-neutral-500">Control Room</p>
              </Link>
            )}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-800 hover:text-white shrink-0"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          </div>

          {/* Nav links — hidden when collapsed */}
          {!collapsed && <nav className="space-y-1">{navLinks}</nav>}

          {/* Collapsed: show icon-only dots for active state */}
          {collapsed && (
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold transition hover:bg-neutral-800 hover:text-white mx-auto ${
                      isActive ? 'bg-neutral-800 text-white' : 'text-neutral-600'
                    }`}
                  >
                    {item.label[0]}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="flex lg:hidden items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="font-bold tracking-tight">Bipi Admin</span>
          <span className="text-xs text-neutral-500">Control Room</span>
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-40 w-64 border-r border-neutral-800 bg-neutral-950 p-6 lg:hidden">
            <Link href="/admin" className="mb-8 block" onClick={() => setOpen(false)}>
              <h2 className="text-lg font-bold tracking-tight">Bipi Admin</h2>
              <p className="text-xs text-neutral-500">Control Room</p>
            </Link>
            <nav className="space-y-1">{navLinks}</nav>
          </div>
        </>
      )}
    </>
  )
}
