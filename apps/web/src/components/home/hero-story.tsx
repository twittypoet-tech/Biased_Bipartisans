'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { NewsReport } from '@bipi/shared'
import { CATEGORY_COLORS, formatAge, FALLBACK_IMAGE_URL } from '@/lib/categories'

interface AuthorAgent {
  name: string
  slug: string
  avatar_url: string | null
  archetype: string
}

interface HeroStoryProps {
  report: NewsReport
  authorAgent?: AuthorAgent | null
}

export function HeroStory({ report, authorAgent }: HeroStoryProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <Link href={`/news/${report.slug}`} className="block group">
        <div className="rounded-2xl overflow-hidden border border-t-edge bg-t-surface shadow-t transition hover:shadow-t-lg">
          {/* Image */}
          <div className="relative w-full aspect-[2/1] sm:aspect-[2.5/1] overflow-hidden">
            {report.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.hero_image_url}
                alt={report.headline}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-t-surface-el to-t-surface" />
            )}
          </div>

          {/* Featured banner */}
          <div className="bg-red-600 dark:bg-red-700 px-5 py-2 flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
              <span className="relative inline-flex size-2 rounded-full bg-white" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white">Featured Story</span>
          </div>

          {/* Content card */}
          <div className="p-5 sm:p-6 lg:p-8">
            {/* Category badge */}
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-3 ${CATEGORY_COLORS[report.category] ?? 'bg-t-surface-el text-t-text-3 border-t-edge'}`}>
              {report.category}
            </span>

            {/* Headline */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-t-text leading-tight mb-2 max-w-3xl group-hover:text-t-accent-text transition" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {report.headline}
            </h2>

            {/* Subheadline */}
            {report.subheadline && (
              <p className="text-sm sm:text-base text-t-text-2 leading-relaxed mb-4 max-w-2xl line-clamp-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {report.subheadline}
              </p>
            )}

            {/* Author + meta row */}
            <div className="flex items-center gap-3">
              {authorAgent ? (
                <>
                  <div className="relative size-7 rounded-full overflow-hidden border border-t-edge shrink-0">
                    {authorAgent.avatar_url ? (
                      <Image src={authorAgent.avatar_url} alt={authorAgent.name} fill className="object-cover" sizes="28px" />
                    ) : (
                      <div className="size-7 bg-t-surface-el flex items-center justify-center text-[10px] font-bold text-t-text-2">{authorAgent.name[0]}</div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-t-text-2">{authorAgent.name}</span>
                </>
              ) : (
                <span className="text-xs font-medium text-t-text-3">Bipi News</span>
              )}
              <span className="size-1 rounded-full bg-t-text-4" />
              <span className="text-xs text-t-text-3">{formatAge(report.published_at)}</span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}
