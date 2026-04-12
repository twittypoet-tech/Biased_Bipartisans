'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { TrendingUp, Phone } from 'lucide-react'
import type { NewsReport } from '@bipi/shared'
import { CATEGORY_COLORS, formatAge } from '@/lib/categories'
import { SignInLink } from '@/components/sign-in-link'

interface AgentOption {
  id: string
  name: string
  slug: string
  avatarUrl: string | null
  archetype: string
}

interface SidebarProps {
  trending: NewsReport[]
  agents: AgentOption[]
  isAuthenticated: boolean
}

export function Sidebar({ trending, agents, isAuthenticated }: SidebarProps) {
  // Pick 3 agents for call CTAs
  const callAgents = agents.slice(0, 3)

  return (
    <aside className="space-y-6 lg:sticky lg:top-[120px]">

      {/* ── Trending Stories ── */}
      {trending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border border-t-edge bg-t-surface p-5 shadow-t"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="size-4" style={{ color: '#C8A44A' }} />
            <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-t-text">Trending</h3>
          </div>

          <div className="space-y-3">
            {trending.map((r, i) => (
              <Link key={r.id} href={`/news/${r.slug}`} className="flex items-start gap-3 group">
                <span className="shrink-0 text-2xl font-bold tabular-nums leading-none mt-0.5" style={{ color: '#C8A44A', fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-t-text leading-snug group-hover:text-t-accent-text transition line-clamp-2">
                    {r.headline}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    {r.category && (
                      <span className={`rounded-full border px-1.5 py-0 text-[8px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[r.category] ?? 'bg-t-surface-el text-t-text-3 border-t-edge'}`}>
                        {r.category.split(' ')[0]}
                      </span>
                    )}
                    <span className="text-[10px] text-t-text-4">{formatAge(r.published_at)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Agent Call CTAs ── */}
      {callAgents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-xl border border-t-edge bg-t-surface p-5 shadow-t"
        >
          <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-t-text mb-4">Talk to an Agent</h3>
          <div className="space-y-3">
            {callAgents.map((a) => (
              <Link key={a.id} href={`/agents/${a.slug}`} className="flex items-center gap-3 group">
                <div className="relative size-10 rounded-full overflow-hidden border border-t-edge shrink-0">
                  {a.avatarUrl ? (
                    <Image src={a.avatarUrl} alt={a.name} fill className="object-cover" sizes="40px" />
                  ) : (
                    <div className="size-10 bg-t-surface-el flex items-center justify-center text-xs font-bold text-t-text-2">{a.name[0]}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-t-text group-hover:text-t-accent-text transition">{a.name}</p>
                  <p className="text-[11px] text-t-text-3 capitalize">{a.archetype.replace(/_/g, ' ')}</p>
                </div>
                <Phone className="size-3.5 text-t-text-4 shrink-0" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Sign Up Promo (anonymous only) ── */}
      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="rounded-xl overflow-hidden border"
          style={{ borderColor: 'rgba(200,164,74,0.3)' }}
        >
          <div className="p-5" style={{ background: 'linear-gradient(135deg, rgba(200,164,74,0.1) 0%, transparent 60%)' }}>
            <h3 className="text-base font-bold text-t-text mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Join the Conversation
            </h3>
            <p className="text-xs text-t-text-2 leading-relaxed mb-4">
              Get 10 free credits. Call any agent. Read transcripts. Shape the debate.
            </p>
            <SignInLink
              className="inline-flex rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#C8A44A' }}
            >
              Sign Up Free
            </SignInLink>
          </div>
        </motion.div>
      )}
    </aside>
  )
}
