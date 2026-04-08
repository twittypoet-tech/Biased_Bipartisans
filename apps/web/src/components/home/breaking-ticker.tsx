'use client'

import Link from 'next/link'
import type { NewsReport } from '@bipi/shared'

interface BreakingTickerProps {
  reports: NewsReport[]
}

export function BreakingTicker({ reports }: BreakingTickerProps) {
  if (reports.length === 0) return null

  // Double the headlines for seamless loop
  const headlines = [...reports, ...reports]

  return (
    <div className="relative overflow-hidden bg-red-950 border-b border-red-900/60">
      <div className="flex items-center">
        {/* Fixed label */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-600 z-10">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white">Breaking</span>
        </div>

        {/* Scrolling marquee */}
        <div className="overflow-hidden flex-1">
          <div className="flex animate-marquee whitespace-nowrap py-2.5">
            {headlines.map((r, i) => (
              <Link
                key={`${r.id}-${i}`}
                href={`/news/${r.slug}`}
                className="inline-flex items-center gap-3 px-6 text-sm text-red-100 hover:text-white transition shrink-0"
              >
                <span className="font-semibold" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {r.headline}
                </span>
                <span className="size-1 rounded-full bg-red-500 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee ${Math.max(20, reports.length * 8)}s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}
