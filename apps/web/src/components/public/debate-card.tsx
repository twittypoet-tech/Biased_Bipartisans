'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Avatar palette (matches past-debate-card) ─────────────────────────────────

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
function getAvatarColors(archetype: string) {
  return avatarPalette[archetype] ?? defaultPalette
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  archetype: string
}

interface DebateCardProps {
  title: string
  slug: string
  headline: string
  status: string
  scheduledAt: string | null
  startedAt?: string | null
  durationMinutes?: number | null
  participants?: Participant[]
  listenerCount?: number
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function RadioIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`size-3.5 ${className ?? ''}`}>
      <path d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 17.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={`size-3.5 ${className ?? ''}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3.5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-3.5 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`size-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatScheduledTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  if (date.toDateString() === now.toDateString()) return timeStr
  if (date.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${timeStr}`

  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${dateStr}, ${timeStr}`
}

function formatStartedTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DebateCard({
  title,
  slug,
  headline,
  status,
  scheduledAt,
  startedAt,
  durationMinutes,
  participants = [],
  listenerCount,
}: DebateCardProps) {
  const [headlineOpen, setHeadlineOpen] = useState(false)
  const [speakersOpen, setSpeakersOpen] = useState(false)

  const isLive = status === 'live'
  const debaters = participants.filter((p) => p.archetype !== 'moderator')

  const timeLabel = isLive
    ? (startedAt ? formatStartedTime(startedAt) : null)
    : (scheduledAt ? formatScheduledTime(scheduledAt) : null)

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 bg-neutral-900/60 p-5 transition-colors hover:bg-neutral-900 ${
        isLive ? 'border-red-700/50' : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* Subtle animated tint for live */}
      {isLive && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ background: 'radial-gradient(circle at 15% 15%, #ef4444, transparent 60%)' }}
        />
      )}

      {/* ── Status badge row ── */}
      <div className="relative mb-4 flex items-center gap-2.5">
        <div
          className={`relative flex size-8 shrink-0 items-center justify-center rounded-full ${
            isLive ? 'bg-red-500' : 'bg-neutral-700'
          }`}
        >
          {isLive && (
            <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-40" />
          )}
          {isLive ? <RadioIcon className="text-white" /> : <CalendarIcon className="text-neutral-300" />}
        </div>
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-bold tracking-wider ${
            isLive ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
          }`}
        >
          {isLive ? 'LIVE NOW' : 'UPCOMING'}
        </span>
      </div>

      {/* ── Title ── */}
      <h3 className="relative text-base font-bold leading-snug text-neutral-100">{title}</h3>

      {/* ── Headline (expandable) ── */}
      {headline && (
        <div className="relative mt-2">
          <p className={`text-sm leading-relaxed text-neutral-400 ${headlineOpen ? '' : 'line-clamp-1'}`}>
            {headline}
          </p>
          <button
            onClick={() => setHeadlineOpen(!headlineOpen)}
            className="mt-1 flex items-center gap-1 text-xs text-neutral-600 transition hover:text-neutral-400"
          >
            {headlineOpen ? 'Less' : 'More'}
            <ChevronDownIcon open={headlineOpen} />
          </button>
        </div>
      )}

      {/* ── Speakers ── */}
      {debaters.length > 0 && (
        <div className="relative mt-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <UsersIcon />
              <span>Speakers ({debaters.length})</span>
            </div>
            <button
              onClick={() => setSpeakersOpen(!speakersOpen)}
              className="flex items-center gap-1 text-xs text-neutral-600 transition hover:text-neutral-400"
            >
              {speakersOpen ? 'Hide' : 'Names'}
              <ChevronDownIcon open={speakersOpen} />
            </button>
          </div>

          {/* Stacked avatars */}
          <div className="flex items-center -space-x-2">
            {debaters.slice(0, 5).map((p) => {
              const colors = getAvatarColors(p.archetype)
              return (
                <span
                  key={p.id}
                  title={p.name}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-neutral-900 text-[11px] font-bold"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {getInitials(p.name)}
                </span>
              )
            })}
            {debaters.length > 5 && (
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-neutral-900 bg-neutral-800 text-xs text-neutral-400">
                +{debaters.length - 5}
              </span>
            )}
          </div>

          {/* Expanded speaker list */}
          {speakersOpen && (
            <div className="mt-3 space-y-2 rounded-lg bg-neutral-800/50 p-3">
              {debaters.map((p) => {
                const colors = getAvatarColors(p.archetype)
                return (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <span
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {getInitials(p.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-200">{p.name}</p>
                      <p className="text-xs capitalize text-neutral-500">
                        {p.archetype.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Info row ── */}
      <div className="relative mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        {timeLabel && (
          <span className="flex items-center gap-1">
            {isLive ? <ClockIcon /> : <CalendarIcon />}
            {timeLabel}
          </span>
        )}
        {durationMinutes && (
          <>
            <span>·</span>
            <span>{durationMinutes} min</span>
          </>
        )}
        {isLive && listenerCount !== undefined && listenerCount > 0 && (
          <>
            <span>·</span>
            <span className="flex items-center gap-1">
              <UsersIcon />
              {listenerCount.toLocaleString()} listening
            </span>
          </>
        )}
      </div>

      {/* ── CTA button ── */}
      <div className="relative mt-4">
        <Link href={`/debates/${slug}`} className="block">
          <span
            className={`flex w-full items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition ${
              isLive
                ? 'bg-neutral-100 text-neutral-900 hover:bg-white active:bg-neutral-200'
                : 'border border-neutral-700 bg-neutral-800/60 text-neutral-200 hover:bg-neutral-800 active:bg-neutral-700'
            }`}
          >
            {isLive ? 'Join Live Debate' : 'Set Reminder'}
          </span>
        </Link>
      </div>
    </div>
  )
}
