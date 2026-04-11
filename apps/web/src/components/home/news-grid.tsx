'use client'

import { motion } from 'framer-motion'
import type { NewsReport, ReporterCall } from '@bipi/shared'
import { NewsGridCard } from './news-grid-card'

interface NewsGridProps {
  reports: NewsReport[]
  reporterCalls: ReporterCall[]
  section?: 'all' | 'featured' | 'long-feed'
}

type FeedItem =
  | { type: 'report'; data: NewsReport }
  | { type: 'call'; data: ReporterCall }

function buildFeed(
  reports: NewsReport[],
  reporterCalls: ReporterCall[],
): FeedItem[] {
  return [
    ...reports.map((r) => ({ type: 'report' as const, data: r })),
    ...reporterCalls.map((c) => ({ type: 'call' as const, data: c })),
  ]
}

export function NewsGrid({
  reports,
  reporterCalls,
  section = 'all',
}: NewsGridProps) {
  const feed = buildFeed(reports, reporterCalls)

  if (feed.length === 0 && section !== 'long-feed') {
    return (
      <div className="flex flex-col items-center py-20 gap-4 text-center">
        <div className="size-12 rounded-full bg-t-surface border border-t-edge flex items-center justify-center text-2xl">
          📰
        </div>
        <p className="text-sm font-medium text-t-text">No stories yet</p>
        <p className="text-xs text-t-text-3">
          Check back soon for the latest coverage.
        </p>
      </div>
    )
  }

  // Featured = first 5 items (large + mediums). Long feed = the rest (text smalls).
  const FEATURED_COUNT = 5

  // Helper: classify size based on original index so slicing doesn't change layout
  const classify = (i: number) =>
    i === 0 ? 'large' : i < FEATURED_COUNT ? 'medium' : 'small'

  const items =
    section === 'featured'
      ? feed.slice(0, FEATURED_COUNT).map((item, i) => ({ item, i }))
      : section === 'long-feed'
      ? feed.slice(FEATURED_COUNT).map((item, i) => ({ item, i: i + FEATURED_COUNT }))
      : feed.map((item, i) => ({ item, i }))

  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map(({ item, i }) => {
        const size = classify(i)
        const colSpan = size === 'large' ? 'md:col-span-2' : ''
        const smallSpan = size === 'small' ? 'md:col-span-2' : ''

        return (
          <motion.div
            key={item.data.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.35 }}
            className={colSpan || smallSpan}
          >
            <NewsGridCard item={item} size={size} />
          </motion.div>
        )
      })}
    </div>
  )
}
