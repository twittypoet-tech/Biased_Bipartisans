'use client'

import Link from 'next/link'
import type { NewsReport, ReporterCall } from '@bipi/shared'
import { CATEGORY_COLORS, CATEGORY_BANNER, formatAge } from '@/lib/categories'

type CardItem =
  | { type: 'report'; data: NewsReport }
  | { type: 'call'; data: ReporterCall }

interface NewsGridCardProps {
  item: CardItem
  size: 'large' | 'medium' | 'small'
}

function getFields(item: CardItem) {
  if (item.type === 'report') {
    const r = item.data
    return {
      slug: r.slug,
      href: `/news/${r.slug}`,
      headline: r.headline,
      summary: r.summary ?? null,
      category: r.category,
      imageUrl: r.hero_image_url,
      publishedAt: r.published_at,
      viewCount: r.view_count ?? 0,
    }
  }
  const c = item.data
  return {
    slug: c.slug,
    href: `/reports/${c.slug}`,
    headline: c.report_headline ?? 'Untitled Report',
    summary: c.call_summary ?? null,
    category: c.report_category ?? null,
    imageUrl: c.report_image_url,
    publishedAt: c.created_at,
    viewCount: c.view_count ?? 0,
  }
}

export function NewsGridCard({ item, size }: NewsGridCardProps) {
  const { href, headline, summary, category, imageUrl, publishedAt, viewCount } = getFields(item)

  // ── Small: compact text-only row ──
  if (size === 'small') {
    return (
      <Link href={href} className="block group">
        <article className="flex items-start gap-3 rounded-lg border border-t-edge bg-t-surface p-3 transition hover:border-t-edge-strong hover:bg-t-hover">
          {category && (
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[category] ?? 'bg-t-surface-el text-t-text-3 border-t-edge'}`}>
              {category.split(' ')[0]}
            </span>
          )}
          <h3 className="flex-1 text-sm font-semibold text-t-text leading-snug group-hover:text-t-accent-text transition line-clamp-2">
            {headline}
          </h3>
          <span className="shrink-0 text-[11px] text-t-text-4 tabular-nums">{formatAge(publishedAt)}</span>
        </article>
      </Link>
    )
  }

  // ── Medium: thumbnail card ──
  if (size === 'medium') {
    return (
      <Link href={href} className="block group h-full">
        <article className="rounded-xl border border-t-edge bg-t-surface overflow-hidden shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg h-full flex flex-col">
          {/* Thumbnail */}
          <div className="relative h-40 overflow-hidden">
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={headline} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </>
            ) : (
              <div className={`absolute inset-0 ${CATEGORY_BANNER[category ?? ''] ?? 'bg-t-surface-el'}`} />
            )}
            {category && (
              <span className={`absolute top-3 left-3 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[category] ?? 'bg-neutral-800/60 text-neutral-400 border-neutral-600/40'}`}>
                {category}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-t-text leading-snug mb-2 group-hover:text-t-accent-text transition line-clamp-3" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {headline}
            </h3>
            <div className="mt-auto flex items-center gap-2 text-[11px] text-t-text-4">
              <span>{formatAge(publishedAt)}</span>
              {viewCount > 0 && (
                <>
                  <span className="size-0.5 rounded-full bg-t-text-4" />
                  <span>{viewCount.toLocaleString()} views</span>
                </>
              )}
            </div>
          </div>
        </article>
      </Link>
    )
  }

  // ── Large: full-width feature card ──
  return (
    <Link href={href} className="block group">
      <article className="rounded-xl border border-t-edge bg-t-surface overflow-hidden shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative sm:w-1/2 h-48 sm:h-auto sm:min-h-[240px] overflow-hidden">
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={headline} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 hidden sm:block" />
              </>
            ) : (
              <div className={`absolute inset-0 ${CATEGORY_BANNER[category ?? ''] ?? 'bg-t-surface-el'}`} />
            )}
          </div>

          {/* Content */}
          <div className="sm:w-1/2 p-5 sm:p-6 flex flex-col justify-center">
            {category && (
              <span className={`inline-flex self-start rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-3 ${CATEGORY_COLORS[category] ?? 'bg-t-surface-el text-t-text-3 border-t-edge'}`}>
                {category}
              </span>
            )}
            <h3 className="text-lg sm:text-xl font-bold text-t-text leading-snug mb-2 group-hover:text-t-accent-text transition" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {headline}
            </h3>
            {summary && (
              <p className="text-sm text-t-text-2 leading-relaxed mb-3 line-clamp-3">
                {summary}
              </p>
            )}
            <div className="flex items-center gap-2 text-[11px] text-t-text-4">
              <span>{formatAge(publishedAt)}</span>
              {viewCount > 0 && (
                <>
                  <span className="size-0.5 rounded-full bg-t-text-4" />
                  <span>{viewCount.toLocaleString()} views</span>
                </>
              )}
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
