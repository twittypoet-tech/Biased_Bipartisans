'use client'

/**
 * AI Disclosure Popup — Presentational Sections
 *
 * Pure presentational subcomponents. No hooks, no state, no logic.
 * Lets the visual layer iterate without touching trigger code.
 *
 * Design direction: editorial gravitas. Georgia serif moments + neutral-900
 * base + #C8A44A gold accent strip, mirroring the methodology page and the
 * newsletter popup. The popup is intentionally dark on every theme — it's a
 * branded moment, not a UI surface.
 *
 * Copy was written and edited under the stop-slop skill: no filler, no em
 * dashes, no passive voice, reader in the room.
 */

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Phone } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DisclosureAgent {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  archetype: string
  short_bio: string
}

const GOLD = '#C8A44A'
const SERIF = 'Georgia, "Times New Roman", serif'

// ── 1. Sticky escape hatch (always visible at top of sheet) ──────────────────

export function ContinueReadingBar({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="inline-block size-2 rounded-full"
          style={{ backgroundColor: GOLD }}
          aria-hidden
        />
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
          AI Disclosure
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="group flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold text-neutral-950 shadow-lg transition active:scale-95"
        style={{ backgroundColor: GOLD }}
      >
        Continue reading
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  )
}

// ── 2. Eye-catching transition / hero — agent name + worldview pull-quote ────

export function TransitionHero({ agent }: { agent: DisclosureAgent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 px-6 pt-7 pb-7 sm:px-8 sm:pt-8 sm:pb-8">
      {/* gold accent rail */}
      <div
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: `linear-gradient(180deg, ${GOLD} 0%, transparent 100%)` }}
      />
      {/* radial glow */}
      <div
        className="pointer-events-none absolute right-[-20%] top-[-30%] size-[280px] opacity-[0.07]"
        style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 60%)` }}
        aria-hidden
      />

      <div className="relative">
        <p
          className="mb-5 text-[10px] font-bold uppercase tracking-[0.28em]"
          style={{ color: GOLD }}
        >
          Written by an AI
        </p>

        <div className="flex items-start gap-4">
          <div
            className="relative size-14 shrink-0 overflow-hidden rounded-full border-2 sm:size-16"
            style={{ borderColor: GOLD }}
          >
            {agent.avatar_url ? (
              <Image
                src={agent.avatar_url}
                alt={agent.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-neutral-800 text-lg font-bold text-neutral-200">
                {agent.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="text-3xl font-bold leading-[1.05] tracking-tight text-neutral-50 sm:text-4xl"
              style={{ fontFamily: SERIF }}
            >
              {agent.name}
            </h2>
            <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
              {agent.archetype.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Worldview pull-quote */}
        <div className="mt-6 border-l-2 pl-5" style={{ borderColor: GOLD }}>
          <p
            className="text-base italic leading-relaxed text-neutral-200 sm:text-lg"
            style={{ fontFamily: SERIF }}
          >
            &ldquo;{agent.short_bio}&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Section divider helper ───────────────────────────────────────────────────

function SectionLabel({ number, title }: { number: string; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="text-[10px] font-bold tracking-[0.28em] text-neutral-500">
        {number}
      </span>
      <span className="h-px flex-1 bg-neutral-800" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
        {title}
      </span>
    </div>
  )
}

// ── 3. The honest-bias body copy ─────────────────────────────────────────────

export function DisclosureBody({ agent }: { agent: DisclosureAgent }) {
  return (
    <div className="mt-8">
      <SectionLabel number="01" title="Why this article reads the way it does" />
      <div className="space-y-4 text-[15px] leading-relaxed text-neutral-300">
        <p>
          {agent.name} is an AI. The worldview above is {agent.name}&rsquo;s permanent
          stance, declared upfront and printed on every story {agent.name} writes.
        </p>
        <p>
          Every fact in this article is sourced. Click any citation and check it
          yourself. The framing belongs to {agent.name}.
        </p>
        <p>
          Bipi News runs 29 reporters like {agent.name}. Each one holds a different
          position. Each one writes openly from it. Read across the roster and you
          see the same story through many angles instead of guessing at a single
          hidden one.
        </p>
        <p className="text-neutral-400">
          We put the reporter&rsquo;s name on the door and the worldview in plain
          sight. That is the editorial product.
        </p>
      </div>
    </div>
  )
}

// ── 4. Learn more about the agent — secondary CTA card ───────────────────────

export function LearnMoreAgentCta({ agent }: { agent: DisclosureAgent }) {
  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="group mt-6 flex items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-700 hover:bg-neutral-900"
    >
      <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-neutral-700">
        {agent.avatar_url ? (
          <Image
            src={agent.avatar_url}
            alt={agent.name}
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-neutral-800 text-sm font-bold text-neutral-300">
            {agent.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Reporter Profile
        </p>
        <p className="text-sm font-semibold text-neutral-100">
          See {agent.name}&rsquo;s full worldview &amp; back catalog
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-200" />
    </Link>
  )
}

// ── 5. Voice reporter pitch ──────────────────────────────────────────────────

export function VoiceReporterPitch({ agent }: { agent: DisclosureAgent }) {
  return (
    <div className="mt-10">
      <SectionLabel number="02" title="Talk to the reporter" />

      <h3
        className="text-2xl font-bold leading-[1.1] tracking-tight text-neutral-50 sm:text-3xl"
        style={{ fontFamily: SERIF }}
      >
        You can call {agent.name}.
      </h3>

      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-neutral-300">
        <p>
          Phone the reporter who wrote this. Push back on a claim. Ask why
          {' '}{agent.name} framed it that way. Try a position you would not
          say out loud anywhere else. Nobody is in the room.
        </p>
        <p>
          No other news site does this. We built it because reading a take and
          arguing with a take are different skills. You should practice both.
        </p>
      </div>
    </div>
  )
}

// ── 6. Free call CTA — strong, curiosity-driving (logged-out only) ───────────

export function FreeCallCallout({
  agent,
  onClose,
}: {
  agent: DisclosureAgent
  onClose: () => void
}) {
  return (
    <div
      className="mt-8 overflow-hidden rounded-2xl p-[1px]"
      style={{
        background: `linear-gradient(135deg, ${GOLD}, transparent 50%, ${GOLD})`,
      }}
    >
      <div className="relative rounded-[14px] bg-neutral-950 px-6 py-7">
        <div
          className="pointer-events-none absolute right-[-30%] top-[-50%] size-[200px] opacity-10"
          style={{
            background: `radial-gradient(circle, ${GOLD} 0%, transparent 60%)`,
          }}
          aria-hidden
        />

        <div className="relative">
          <p
            className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            Your first call is free
          </p>
          <h3
            className="text-2xl font-bold leading-[1.05] text-neutral-50 sm:text-[28px]"
            style={{ fontFamily: SERIF }}
          >
            Five minutes.
            <br />
            No sign-up.
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            Try it on this story. Pressure-test {agent.name} and see what holds up.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="group mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold text-neutral-950 shadow-lg transition active:scale-[0.98]"
            style={{ backgroundColor: GOLD }}
          >
            <Phone className="size-4" />
            Try the call now
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <p className="mt-3 text-center text-[11px] text-neutral-500">
            The call button lives in the article. You will not miss it.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── 7. Methodology link footer ───────────────────────────────────────────────

export function MethodologyFooterLink() {
  return (
    <div className="mb-2 mt-10 flex items-center justify-center">
      <Link
        href="/about/methodology"
        className="group flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500 transition hover:text-neutral-300"
      >
        <span>How Bipi News works</span>
        <span
          className="inline-block h-px w-6 transition-all group-hover:w-10"
          style={{ backgroundColor: GOLD }}
        />
        <span>Read our methodology</span>
      </Link>
    </div>
  )
}
