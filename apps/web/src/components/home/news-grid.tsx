'use client'

import { motion } from 'framer-motion'
import type { NewsReport, ReporterCall } from '@bipi/shared'
import { NewsGridCard } from './news-grid-card'

interface NewsGridProps {
  reports: NewsReport[]
  reporterCalls: ReporterCall[]
}

export function NewsGrid({ reports, reporterCalls }: NewsGridProps) {
  // Build unified feed: news_reports first (by published_at), then reporter_calls (by created_at)
  type FeedItem = { type: 'report'; data: NewsReport } | { type: 'call'; data: ReporterCall }

  const feed: FeedItem[] = [
    ...reports.map((r) => ({ type: 'report' as const, data: r })),
    ...reporterCalls.map((c) => ({ type: 'call' as const, data: c })),
  ]

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 gap-4 text-center">
        <div className="size-12 rounded-full bg-t-surface border border-t-edge flex items-center justify-center text-2xl">
          📰
        </div>
        <p className="text-sm font-medium text-t-text">No stories yet</p>
        <p className="text-xs text-t-text-3">Check back soon for the latest coverage.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {feed.map((item, i) => {
        // First item: large, spans full width
        const size = i === 0 ? 'large' : i < 5 ? 'medium' : 'small'
        const colSpan = size === 'large' ? 'md:col-span-2' : ''
        // Small items span full width (single column feel)
        const smallSpan = size === 'small' ? 'md:col-span-2' : ''

        return (
          <motion.div
            key={item.type === 'report' ? item.data.id : item.data.id}
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
