'use client'

import Image from 'next/image'
import Link from 'next/link'

interface MarqueeAgent {
  id: string
  name: string
  slug: string
  avatarUrl: string | null
  archetype: string
}

interface AgentMarqueeProps {
  agents: MarqueeAgent[]
}

// Duplicate for seamless infinite loop
function MarqueeTrack({ agents }: { agents: MarqueeAgent[] }) {
  return (
    <div className="flex shrink-0 items-end gap-8 animate-marquee">
      {agents.map((agent, i) => (
        <Link
          key={`${agent.id}-${i}`}
          href={`/agents/${agent.slug}`}
          className="group flex flex-col items-center gap-2.5 shrink-0"
        >
          <div className="relative size-16 sm:size-20 rounded-full overflow-hidden border-2 border-neutral-700/60 group-hover:border-neutral-400 transition-all duration-300 group-hover:scale-105">
            {agent.avatarUrl ? (
              <Image
                src={agent.avatarUrl}
                alt={agent.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-neutral-800 text-base font-bold text-neutral-300">
                {agent.name[0]}
              </div>
            )}
          </div>
          <span className="text-xs text-neutral-500 group-hover:text-neutral-300 transition-colors duration-200 truncate max-w-[80px] text-center font-medium">
            {agent.name}
          </span>
        </Link>
      ))}
    </div>
  )
}

export function AgentMarquee({ agents }: AgentMarqueeProps) {
  if (agents.length === 0) return null

  return (
    <div
      className="relative overflow-hidden py-6"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}
    >
      <div className="flex gap-8">
        <MarqueeTrack agents={agents} />
        {/* Duplicate for seamless loop */}
        <MarqueeTrack agents={agents} />
      </div>
    </div>
  )
}
