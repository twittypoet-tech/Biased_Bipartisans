import Link from 'next/link'

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/agents', label: 'Agents' },
  { href: '/admin/debates', label: 'Debates' },
  { href: '/admin/evaluations', label: 'Evaluations' },
  { href: '/admin/memories', label: 'Memories' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-950 p-4">
        <Link href="/admin" className="mb-8 block">
          <h2 className="text-lg font-bold tracking-tight">Bipi Admin</h2>
          <p className="text-xs text-neutral-500">Control Room</p>
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto bg-neutral-950 p-6">{children}</main>
    </div>
  )
}
