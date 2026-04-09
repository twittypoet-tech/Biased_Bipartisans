'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import type { NewsReport } from '@bipi/shared'

interface BreakingTickerProps {
  reports: NewsReport[]
}

export function BreakingTicker({ reports }: BreakingTickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [animating, setAnimating] = useState(true)

  // Double for seamless loop
  const headlines = [...reports, ...reports]
  const duration = Math.max(1.7, reports.length * 0.57)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    // Reset animation when it completes a cycle
    const handleEnd = () => {
      el.style.animation = 'none'
      // Force reflow
      void el.offsetHeight
      el.style.animation = ''
    }
    el.addEventListener('animationiteration', handleEnd)
    return () => el.removeEventListener('animationiteration', handleEnd)
  }, [])

  if (reports.length === 0) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bipi-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
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
            <div
              ref={scrollRef}
              className="flex whitespace-nowrap py-2.5"
              style={{
                animation: animating ? `bipi-marquee ${duration}s linear infinite` : 'none',
              }}
              onMouseEnter={() => setAnimating(false)}
              onMouseLeave={() => setAnimating(true)}
            >
              {headlines.map((r, i) => (
                <Link
                  key={`${r.id}-${i}`}
                  href={`/news/${r.slug}`}
                  className="inline-flex items-center gap-3 px-6 text-sm text-white hover:text-red-100 transition shrink-0"
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
      </div>
    </>
  )
}
