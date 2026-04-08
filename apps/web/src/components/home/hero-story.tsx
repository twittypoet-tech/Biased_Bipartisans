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
        <div className="relative rounded-2xl overflow-hidden border border-t-edge bg-t-surface shadow-t transition hover:shadow-t-lg">
          {/* Image */}
          <div className="relative w-full aspect-[2/1] sm:aspect-[2.5/1]">
            {report.hero_image_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.hero_image_url}
                  alt={report.headline}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900" />
            )}

            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:p-10">
              {/* Category badge */}
              <span className={`inline-flex self-start rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider mb-3 ${CATEGORY_COLORS[report.category] ?? 'bg-neutral-800/60 text-neutral-400 border-neutral-600/40'}`}>
                {report.category}
              </span>

              {/* Headline */}
              <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white leading-tight mb-2 max-w-3xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {report.headline}
              </h2>

              {/* Subheadline */}
              {report.subheadline && (
                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed mb-3 max-w-2xl line-clamp-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {report.subheadline}
                </p>
              )}

              {/* Author + meta row */}
              <div className="flex items-center gap-3">
                {authorAgent ? (
                  <>
                    <div className="relative size-7 rounded-full overflow-hidden border border-white/30 shrink-0">
                      {authorAgent.avatar_url ? (
                        <Image src={authorAgent.avatar_url} alt={authorAgent.name} fill className="object-cover" sizes="28px" />
                      ) : (
                        <div className="size-7 bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-white">{authorAgent.name[0]}</div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-neutral-300">{authorAgent.name}</span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-neutral-400">Biased Bipartisans</span>
                )}
                <span className="size-1 rounded-full bg-neutral-500" />
                <span className="text-xs text-neutral-400">{formatAge(report.published_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </section>
  )
}
