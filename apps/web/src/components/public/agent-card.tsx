'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { getArchetypeColor, getExpertiseColor } from '@/lib/agent-colors'

interface AgentCardProps {
  name: string
  slug: string
  archetype: string
  shortBio: string
  llmProvider: string
  role: string
  avatarUrl?: string | null
  expertise?: string[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function AgentCard({
  name,
  slug,
  archetype,
  shortBio,
  llmProvider,
  role,
  avatarUrl,
  expertise = [],
}: AgentCardProps) {
  const colors = getArchetypeColor(archetype)
  const [openExpertisePopup, setOpenExpertisePopup] = useState(false)

  if (role === 'moderator') return null

  return (
    <Link
      href={`/agents/${slug}`}
      className={`block rounded-lg border ${colors.border} ${colors.bg} p-5 transition hover:brightness-110`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-neutral-700">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center text-xs font-bold ${colors.bg} ${colors.text}`}>
              {getInitials(name)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-lg font-semibold ${colors.text}`}>{name}</h3>
          {shortBio && <p className="mt-1 text-sm text-neutral-400 line-clamp-1">{shortBio}</p>}
        </div>
      </div>

      {/* Expertise Badges */}
      {expertise.length > 0 && (
        <div className="mt-3 relative">
          <div className="flex items-center gap-2 flex-wrap">
            {expertise[0] && (
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${getExpertiseColor(expertise[0]).badge}`}>
                {expertise[0]}
              </span>
            )}
            {expertise.length > 1 && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  setOpenExpertisePopup(!openExpertisePopup)
                }}
                className="text-xs text-neutral-400 hover:text-neutral-300 font-medium"
                type="button"
              >
                +{expertise.length - 1}
              </button>
            )}
          </div>

          {/* Expertise Popup */}
          {openExpertisePopup && (
            <div className="absolute top-full left-0 z-50 mt-2 w-56 rounded-lg border border-neutral-700 bg-neutral-800 p-3 shadow-lg">
              <p className="mb-2 text-xs font-semibold text-neutral-400">Expertise Domains</p>
              <div className="flex flex-wrap gap-2">
                {expertise.map((domain) => (
                  <span
                    key={domain}
                    className={`rounded-full px-2 py-1 text-xs ${getExpertiseColor(domain).badge}`}
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-xs text-neutral-500">
        Powered by {llmProvider === 'anthropic' ? 'Claude' : 'GPT-4o'}
      </div>
    </Link>
  )
}
