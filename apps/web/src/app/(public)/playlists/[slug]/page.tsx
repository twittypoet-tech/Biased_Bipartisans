export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getPlaylistWithDebates } from '@bipi/db'
import { getArchetypeColor } from '@/lib/agent-colors'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const avatarPalette: Record<string, { bg: string; text: string }> = {
  hawk:                { bg: '#7f1d1d', text: '#fca5a5' },
  dove:                { bg: '#0c4a6e', text: '#7dd3fc' },
  technocrat:          { bg: '#3b0764', text: '#c4b5fd' },
  populist:            { bg: '#78350f', text: '#fcd34d' },
  cynic:               { bg: '#3f3f46', text: '#d4d4d8' },
  conspiracy_theorist: { bg: '#064e3b', text: '#6ee7b7' },
  institutionalist:    { bg: '#1e3a5f', text: '#93c5fd' },
  libertarian:         { bg: '#7c2d12', text: '#fdba74' },
}
const defaultPalette = { bg: '#27272a', text: '#a1a1aa' }

const statusBadge: Record<string, string> = {
  live:      'bg-red-900/80 text-red-200 animate-pulse',
  scheduled: 'bg-blue-900/80 text-blue-200',
  ended:     'bg-zinc-700/60 text-zinc-300',
  draft:     'bg-zinc-800/60 text-zinc-500',
}

export default async function PlaylistDetailPage({ params }: Props) {
  const { slug } = await params
  const db = createServerClient()
  const result = await getPlaylistWithDebates(db, slug)

  if (!result) notFound()

  const { playlist, debates, participantsMap } = result

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-600">
        <Link href="/playlists" className="hover:text-neutral-400 transition-colors">Playlists</Link>
        <span>/</span>
        <span className="text-neutral-400 truncate max-w-[200px]">{playlist.title}</span>
      </nav>

      {/* Hero header */}
      <div className="mb-8 sm:mb-10">
        {playlist.theme && (
          <span className="inline-block rounded-full border border-neutral-700/40 bg-neutral-800/60 px-2.5 py-0.5 text-[11px] font-medium text-neutral-400 mb-3">
            {playlist.theme}
          </span>
        )}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-3">
          {playlist.title}
        </h1>
        {playlist.description && (
          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl leading-relaxed">
            {playlist.description}
          </p>
        )}
        <p className="mt-3 text-sm text-neutral-600">
          {result.debateCount} {result.debateCount === 1 ? 'debate' : 'debates'}
        </p>
      </div>

      {debates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-700 py-20 text-center">
          <p className="text-neutral-500 text-sm">No debates in this playlist yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debates.map((debate, index) => {
            const d = debate as Record<string, unknown>
            const debateId = d.id as string
            const participants = (participantsMap[debateId] ?? []) as Array<Record<string, unknown>>
            const debaters = participants.filter((p) => (p.role as string) === 'debater').map((p) => {
              const agent = p.agents as Record<string, unknown> | undefined
              return {
                id: p.agent_id as string,
                name: (agent?.name as string) ?? 'Unknown',
                archetype: (agent?.archetype as string) ?? 'unknown',
                avatarUrl: (agent?.avatar_url as string | null) ?? null,
              }
            })

            const status = d.status as string
            const badgeCls = statusBadge[status] ?? 'bg-zinc-700/60 text-zinc-300'
            const isLive = status === 'live'

            return (
              <Link
                key={debateId}
                href={`/debates/${d.slug as string}`}
                className="group flex items-start gap-4 sm:gap-5 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5 transition-all hover:border-neutral-700 hover:bg-neutral-900/70 hover:shadow-md hover:shadow-neutral-950/40 active:bg-neutral-900/50"
              >
                {/* Position number */}
                <div className="hidden sm:flex shrink-0 size-8 items-center justify-center rounded-full border border-neutral-700/50 bg-neutral-800/60 text-xs font-medium text-neutral-500 mt-0.5">
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${badgeCls}`}>
                      {isLive ? '● Live' : status}
                    </span>
                    {(d.expertise as string[] | undefined)?.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full border border-neutral-700/40 bg-neutral-800/40 px-2 py-0.5 text-[10px] text-neutral-500">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h3 className="font-semibold text-neutral-100 leading-snug group-hover:text-white transition-colors line-clamp-2 mb-1 text-sm sm:text-base">
                    {d.title as string}
                  </h3>

                  {/* Participants */}
                  {debaters.length > 0 && (
                    <div className="flex items-center gap-2 mt-2.5">
                      <div className="flex -space-x-1.5">
                        {debaters.slice(0, 4).map((agent) => {
                          const pal = avatarPalette[agent.archetype] ?? defaultPalette
                          if (agent.avatarUrl) {
                            return (
                              <div key={agent.id} className="relative size-6 rounded-full overflow-hidden border border-neutral-900">
                                <Image src={agent.avatarUrl} alt={agent.name} fill sizes="24px" className="object-cover" />
                              </div>
                            )
                          }
                          return (
                            <span
                              key={agent.id}
                              className="inline-flex size-6 items-center justify-center rounded-full border border-neutral-900 text-[9px] font-bold"
                              style={{ background: pal.bg, color: pal.text }}
                            >
                              {getInitials(agent.name)}
                            </span>
                          )
                        })}
                      </div>
                      <span className="text-xs text-neutral-600">
                        {debaters.map((a) => a.name).join(' vs ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="shrink-0 mt-1">
                  <svg className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Back link */}
      <div className="mt-10">
        <Link href="/playlists" className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All playlists
        </Link>
      </div>
    </div>
  )
}
