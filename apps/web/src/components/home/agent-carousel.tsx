'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Phone, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NewsReport } from '@bipi/shared'
import { FALLBACK_IMAGE_URL } from '@/lib/categories'

interface AgentOption {
  id: string
  name: string
  slug: string
  avatarUrl: string | null
  archetype: string
}

interface AgentCarouselProps {
  agents: AgentOption[]
  recentReports: NewsReport[]
}

export function AgentCarousel({ agents, recentReports }: AgentCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (recentReports.length === 0) return null

  // Pair each report with its actual author agent (by agent_id match)
  const agentMap = new Map(agents.map((a) => [a.id, a]))
  const cards = recentReports
    .slice(0, 12)
    .map((report) => ({
      report,
      agent: report.agent_id ? agentMap.get(report.agent_id) ?? null : null,
    }))
    .filter((c) => c.agent !== null) as { report: typeof recentReports[number]; agent: AgentOption }[]

  function scroll(direction: 'left' | 'right') {
    if (!scrollRef.current) return
    const amount = direction === 'left' ? -360 : 360
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="relative py-6 bg-t-bg">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ backgroundColor: '#C8A44A' }} />
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-t-text-2">Talk to an Agent</h2>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <button onClick={() => scroll('left')} className="size-8 rounded-full border border-t-edge bg-t-surface flex items-center justify-center text-t-text-3 hover:text-t-text hover:border-t-edge-strong transition">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => scroll('right')} className="size-8 rounded-full border border-t-edge bg-t-surface flex items-center justify-center text-t-text-3 hover:text-t-text hover:border-t-edge-strong transition">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {cards.map(({ report, agent }, i) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="snap-start shrink-0 w-[300px] sm:w-[340px]"
            >
              <Link href={`/news/${report.slug}`} className="block group">
                <div className="rounded-xl border border-t-edge bg-t-surface overflow-hidden shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg">
                  {/* Image area */}
                  <div className="relative h-40 overflow-hidden">
                    {report.hero_image_url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={report.hero_image_url}
                          alt={report.headline}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-t-surface-el to-t-surface" />
                    )}

                    {/* Agent badge overlay */}
                    {agent && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <div className="relative size-8 rounded-full overflow-hidden border-2 border-white/30 shrink-0">
                          {agent.avatarUrl ? (
                            <Image src={agent.avatarUrl} alt={agent.name} fill className="object-cover" sizes="32px" />
                          ) : (
                            <div className="size-8 bg-neutral-700 flex items-center justify-center text-xs font-bold text-white">{agent.name[0]}</div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-white drop-shadow-lg">{agent.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <p className="text-sm font-bold text-t-text leading-snug mb-3 line-clamp-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                      {report.headline}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white transition group-hover:opacity-90" style={{ backgroundColor: '#C8A44A' }}>
                        <Phone className="size-3" />
                        Call {agent?.name.split(' ').pop()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
