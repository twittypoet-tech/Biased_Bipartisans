import Link from 'next/link'
import { statusColors } from '@/lib/agent-colors'

interface DebateCardProps {
  title: string
  slug: string
  headline: string
  status: string
  scheduledAt: string | null
  endedAt: string | null
  format?: string
}

export function DebateCard({ title, slug, headline, status, scheduledAt, endedAt, format }: DebateCardProps) {
  const statusColor = statusColors[status] ?? 'bg-zinc-700 text-zinc-300'
  const isLive = status === 'live'

  return (
    <Link
      href={`/debates/${slug}`}
      className={`block rounded-lg border ${isLive ? 'border-red-700/60' : 'border-neutral-800'} bg-neutral-900/60 p-5 transition hover:bg-neutral-900 hover:border-neutral-700`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-neutral-100 truncate">{title}</h3>
          <p className="mt-1 text-sm text-neutral-400 line-clamp-2">{headline}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor} ${isLive ? 'animate-pulse' : ''}`}>
          {isLive ? 'LIVE' : status.toUpperCase()}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
        {format && <span>{format}</span>}
        {scheduledAt && status === 'scheduled' && (
          <span>{new Date(scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
        )}
        {endedAt && status === 'ended' && (
          <span>Ended {new Date(endedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>
    </Link>
  )
}
