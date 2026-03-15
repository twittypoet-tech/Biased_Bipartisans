import Link from 'next/link'
import { getArchetypeColor } from '@/lib/agent-colors'

interface AgentCardProps {
  name: string
  slug: string
  archetype: string
  shortBio: string
  llmProvider: string
  role: string
}

export function AgentCard({ name, slug, archetype, shortBio, llmProvider, role }: AgentCardProps) {
  const colors = getArchetypeColor(archetype)

  if (role === 'moderator') return null

  return (
    <Link
      href={`/agents/${slug}`}
      className={`block rounded-lg border ${colors.border} ${colors.bg} p-5 transition hover:brightness-110`}
    >
      <div className="flex items-start justify-between">
        <h3 className={`text-lg font-semibold ${colors.text}`}>{name}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors.badge}`}>
          {archetype.replace('_', ' ')}
        </span>
      </div>
      <p className="mt-2 text-sm text-neutral-400 line-clamp-2">{shortBio}</p>
      <div className="mt-3 text-xs text-neutral-500">
        Powered by {llmProvider === 'anthropic' ? 'Claude' : 'GPT-4o'}
      </div>
    </Link>
  )
}
