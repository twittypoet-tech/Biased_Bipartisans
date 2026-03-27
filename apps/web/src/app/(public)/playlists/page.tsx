export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { listPublishedPlaylists, getPlaylistDebateCount } from '@bipi/db'
import Link from 'next/link'

const themeColors: Record<string, { badge: string; glow: string }> = {
  'AI & Technology':     { badge: 'bg-violet-900/60 text-violet-300 border border-violet-700/40', glow: 'from-violet-950/30' },
  'Religion & Morality': { badge: 'bg-amber-900/60 text-amber-300 border border-amber-700/40',   glow: 'from-amber-950/30' },
  'Politics & Society':  { badge: 'bg-blue-900/60 text-blue-300 border border-blue-700/40',      glow: 'from-blue-950/30' },
  'Science & Medicine':  { badge: 'bg-teal-900/60 text-teal-300 border border-teal-700/40',      glow: 'from-teal-950/30' },
  'Philosophy & Ethics': { badge: 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/40', glow: 'from-indigo-950/30' },
  'Economics':           { badge: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/40', glow: 'from-emerald-950/30' },
  'Current Events':      { badge: 'bg-red-900/60 text-red-300 border border-red-700/40',         glow: 'from-red-950/30' },
}
const defaultTheme = { badge: 'bg-neutral-800/60 text-neutral-400 border border-neutral-700/40', glow: 'from-neutral-900/30' }

export default async function PlaylistsPage() {
  const db = createServerClient()
  const playlists = await listPublishedPlaylists(db)

  // Fetch debate counts in parallel
  const counts = await Promise.all(
    playlists.map((p) => getPlaylistDebateCount(db, p.id)),
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      {/* Header */}
      <div className="mb-10 sm:mb-12">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" aria-hidden>🎵</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Playlists</h1>
        </div>
        <p className="text-neutral-400 text-base sm:text-lg max-w-xl">
          Curated collections of debates grouped by theme. Binge the full arc of an argument.
        </p>
      </div>

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-700 py-20 text-center">
          <p className="text-neutral-500 text-sm">No playlists published yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {playlists.map((playlist, i) => {
            const theme = themeColors[playlist.theme] ?? defaultTheme
            const count = counts[i] ?? 0
            return (
              <Link
                key={playlist.id}
                href={`/playlists/${playlist.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900/80 hover:shadow-lg hover:shadow-neutral-950/50 hover:-translate-y-0.5 active:translate-y-0"
              >
                {/* Gradient glow top */}
                <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${theme.glow} via-neutral-700/60 to-transparent`} />

                <div className="flex flex-1 flex-col p-5">
                  {/* Theme badge */}
                  {playlist.theme && (
                    <span className={`self-start rounded-full px-2.5 py-0.5 text-[11px] font-medium ${theme.badge} mb-3`}>
                      {playlist.theme}
                    </span>
                  )}

                  {/* Title */}
                  <h2 className="text-base sm:text-lg font-semibold text-white leading-snug group-hover:text-neutral-100 transition-colors line-clamp-2 mb-2">
                    {playlist.title}
                  </h2>

                  {/* Description */}
                  {playlist.description && (
                    <p className="text-sm text-neutral-500 line-clamp-3 leading-relaxed flex-1">
                      {playlist.description}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-neutral-800/60 px-5 py-3">
                  <span className="text-xs text-neutral-600">
                    {count} {count === 1 ? 'debate' : 'debates'}
                  </span>
                  <span className="text-xs text-neutral-600 group-hover:text-neutral-400 transition-colors flex items-center gap-1">
                    View all
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
