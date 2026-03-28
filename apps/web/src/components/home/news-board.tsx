'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import type { NewsReport, NewsCategory } from '@bipi/shared'
import { getExpertiseColor } from '@/lib/agent-colors'

const ALL_CATEGORIES: NewsCategory[] = [
  'Environmental Science',
  'History & Politics',
  'Law & Jurisprudence',
  'Medicine & Healthcare',
  'Philosophy & Ethics',
  'Rhetoric & Persuasion',
  'Statistics & Data Science',
  'Technology & Innovation',
]

function CategoryBadge({ category, size = 'sm' }: { category: string; size?: 'sm' | 'xs' }) {
  const colors = getExpertiseColor(category)
  return (
    <span
      className={`inline-block rounded-full border px-2.5 font-semibold uppercase tracking-wider ${colors.badge} ${colors.border} ${size === 'xs' ? 'py-0.5 text-[10px]' : 'py-1 text-xs'}`}
    >
      {category}
    </span>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function FeaturedCard({ report }: { report: NewsReport }) {
  return (
    <Link
      href={`/news/${report.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 transition-all hover:border-neutral-600 hover:shadow-2xl hover:shadow-black/40"
    >
      {report.hero_image_url ? (
        <div className="relative h-64 w-full overflow-hidden sm:h-80 lg:h-96">
          <Image
            src={report.hero_image_url}
            alt={report.hero_image_caption ?? report.headline}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <CategoryBadge category={report.category} />
            <h3 className="mt-3 text-xl font-bold leading-snug text-white sm:text-2xl lg:text-3xl">
              {report.headline}
            </h3>
            {report.subheadline && (
              <p className="mt-1.5 text-sm text-neutral-300 sm:text-base">{report.subheadline}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-6 sm:p-8">
          <CategoryBadge category={report.category} />
          <h3 className="mt-3 text-xl font-bold leading-snug text-white sm:text-2xl lg:text-3xl">
            {report.headline}
          </h3>
          {report.subheadline && (
            <p className="mt-1.5 text-sm text-neutral-300 sm:text-base">{report.subheadline}</p>
          )}
        </div>
      )}
      <div className="flex items-center justify-between border-t border-neutral-800 px-6 py-4">
        <p className="line-clamp-2 flex-1 text-sm text-neutral-400">{report.summary}</p>
        <span className="ml-4 flex-shrink-0 text-sm font-semibold text-amber-400 transition-colors group-hover:text-amber-300">
          Read Report →
        </span>
      </div>
    </Link>
  )
}

function StoryCard({ report }: { report: NewsReport }) {
  return (
    <Link
      href={`/news/${report.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-all hover:border-neutral-600"
    >
      {report.hero_image_url ? (
        <div className="relative h-36 w-full overflow-hidden sm:h-44">
          <Image
            src={report.hero_image_url}
            alt={report.hero_image_caption ?? report.headline}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="h-36 w-full bg-neutral-800 sm:h-44" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <CategoryBadge category={report.category} size="xs" />
        <h4 className="text-sm font-semibold leading-snug text-white line-clamp-3 sm:text-base">
          {report.headline}
        </h4>
        <p className="mt-auto text-xs text-neutral-500">{formatDate(report.published_at)}</p>
      </div>
    </Link>
  )
}

function SecondaryHeadline({ report }: { report: NewsReport }) {
  return (
    <Link
      href={`/news/${report.slug}`}
      className="group flex items-start gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4 transition-all hover:border-neutral-600 sm:p-5"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={report.category} size="xs" />
          <span className="text-xs text-neutral-500">{formatDate(report.published_at)}</span>
        </div>
        <h4 className="mt-2 text-base font-bold leading-snug text-white sm:text-lg">
          {report.headline}
        </h4>
        <p className="mt-1 text-sm text-neutral-400 line-clamp-2">{report.summary}</p>
      </div>
      <span className="mt-1 flex-shrink-0 text-sm font-semibold text-amber-400 transition-colors group-hover:text-amber-300">
        →
      </span>
    </Link>
  )
}

function GridCard({ report }: { report: NewsReport }) {
  return (
    <Link
      href={`/news/${report.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition-all hover:border-neutral-600"
    >
      {report.hero_image_url ? (
        <div className="relative h-32 w-full overflow-hidden">
          <Image
            src={report.hero_image_url}
            alt={report.hero_image_caption ?? report.headline}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="h-32 w-full bg-neutral-800" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <CategoryBadge category={report.category} size="xs" />
        <h4 className="text-sm font-semibold leading-snug text-white line-clamp-3">
          {report.headline}
        </h4>
        <p className="mt-auto text-xs text-neutral-500">{formatDate(report.published_at)}</p>
      </div>
    </Link>
  )
}

interface NewsBoardProps {
  reports: NewsReport[]
}

export function NewsBoard({ reports }: NewsBoardProps) {
  const [activeCategory, setActiveCategory] = useState<NewsCategory | null>(null)

  if (reports.length === 0) {
    return (
      <section className="py-20 sm:py-28 bg-neutral-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
              News
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Intelligence Reports
            </h2>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 py-20 text-center">
            <p className="text-neutral-500 text-base">No reports published yet.</p>
            <p className="mt-1 text-neutral-600 text-sm">Check back soon.</p>
          </div>
        </div>
      </section>
    )
  }

  const featured = (reports.find((r) => r.is_featured) ?? reports[0])!
  const remaining = reports.filter((r) => r.id !== featured.id)

  const story2 = remaining[0] ?? null
  const story3 = remaining[1] ?? null
  const secondary = remaining[2] ?? null
  const gridReports = remaining.slice(3)

  const filteredGrid = activeCategory
    ? gridReports.filter((r) => r.category === activeCategory)
    : gridReports

  // Determine which categories have reports in the grid
  const availableCategories = ALL_CATEGORIES.filter((cat) =>
    gridReports.some((r) => r.category === cat),
  )

  return (
    <section className="py-20 sm:py-28 bg-neutral-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">

        {/* Section header */}
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
            News
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Intelligence Reports
          </h2>
          <p className="mt-3 text-neutral-400 max-w-md mx-auto">
            AI-generated analysis on the issues shaping our world.
          </p>
        </div>

        {/* Featured report */}
        <FeaturedCard report={featured} />

        {/* Story row */}
        {(story2 || story3) && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {story2 && <StoryCard report={story2} />}
            {story3 && <StoryCard report={story3} />}
          </div>
        )}

        {/* Secondary headline (text-forward) */}
        {secondary && (
          <div className="mt-4">
            <SecondaryHeadline report={secondary} />
          </div>
        )}

        {/* Category filter + grid */}
        {gridReports.length > 0 && (
          <div className="mt-10">
            {/* Filter tabs */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeCategory === null
                    ? 'border-neutral-500 bg-neutral-700 text-white'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300'
                }`}
              >
                All
              </button>
              {availableCategories.map((cat) => {
                const colors = getExpertiseColor(cat)
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive ? `${colors.badge} ${colors.border}` : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>

            {filteredGrid.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">No reports in this category yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGrid.map((r) => (
                  <GridCard key={r.id} report={r} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  )
}
