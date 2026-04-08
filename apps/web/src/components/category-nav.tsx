'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_CATEGORIES } from '@/lib/categories'

export function CategoryNav() {
  const pathname = usePathname()

  // Extract active category slug from pathname like /category/world-affairs
  const activeSlug = pathname.startsWith('/category/')
    ? pathname.split('/')[2] ?? ''
    : ''

  return (
    <div className="border-b border-t-edge bg-t-bg/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl relative">
        <nav
          className="flex items-center gap-1 overflow-x-auto px-4 py-2 scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch', maskImage: 'linear-gradient(to right, black 90%, transparent 100%)' }}
        >
          {NAV_CATEGORIES.map((cat) => {
            const isActive = cat.slug === activeSlug
            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-t-active text-t-text font-semibold'
                    : 'text-t-text-3 hover:text-t-text-2 hover:bg-t-hover'
                }`}
              >
                {cat.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
