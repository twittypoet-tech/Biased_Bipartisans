'use client'

/**
 * Methodology Page — Client Component
 *
 * Dense, graphic-forward "how it works" page. Each step in the article-writing
 * and live-call pipelines pairs a copy block with its own animated demo.
 *
 * All demos are inline subcomponents in this file. Animations use framer-motion
 * (already a dep). Theme tokens (bg-t-bg, text-t-text, etc.) keep both light
 * and dark mode happy without per-class overrides.
 */

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  ArrowRight,
  Globe,
  Link2,
  Phone,
  Quote,
  Radio,
  ShieldOff,
  Users,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MethodologyAgent {
  id: string
  name: string
  slug: string
  archetype: string
  avatar_url: string
  short_bio: string
}

interface MethodologyClientProps {
  agents: MethodologyAgent[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOLD = '#C8A44A'
const SERIF = 'Georgia, "Times New Roman", serif'

// ─────────────────────────────────────────────────────────────────────────────
// DEMOS
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Search Demo — typewriter query + URL stream ───────────────────────────

const SEARCH_QUERIES = [
  'fed rate decision september 2026',
  'house energy bill markup',
  'taiwan strait incident timeline',
  'inflation cpi october breakdown',
]

const SEARCH_RESULTS = [
  ['reuters.com', 'bloomberg.com', 'federalreserve.gov', 'wsj.com'],
  ['congress.gov', 'energy.gov', 'politico.com', 'nytimes.com'],
  ['state.gov', 'reuters.com', 'aljazeera.com', 'csis.org'],
  ['bls.gov', 'ft.com', 'bloomberg.com', 'reuters.com'],
]

function SearchDemo() {
  const [queryIdx, setQueryIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const target = SEARCH_QUERIES[queryIdx] ?? ''
  const results = SEARCH_RESULTS[queryIdx] ?? []

  useEffect(() => {
    let i = 0
    setTyped('')
    const typeInterval = setInterval(() => {
      i++
      setTyped(target.slice(0, i))
      if (i >= target.length) {
        clearInterval(typeInterval)
        setTimeout(() => setQueryIdx((p) => (p + 1) % SEARCH_QUERIES.length), 2400)
      }
    }, 60)
    return () => clearInterval(typeInterval)
  }, [queryIdx, target])

  const showResults = typed === target

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-t-edge bg-t-surface p-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-t-text-3">
        <Globe className="size-3" style={{ color: GOLD }} />
        Live web search
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg border border-t-edge bg-t-surface-inset px-3 py-2.5">
        <div className="size-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
        <span className="font-mono text-[13px] text-t-text">
          {typed}
          <span className="ml-0.5 inline-block h-[14px] w-[1.5px] animate-pulse bg-t-text-2 align-middle" />
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {results.map((url, i) => (
          <motion.div
            key={`${queryIdx}-${url}`}
            initial={{ opacity: 0, x: -8 }}
            animate={showResults ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            transition={{ delay: showResults ? i * 0.12 : 0, duration: 0.3 }}
            className="flex items-center gap-2 text-[11px]"
          >
            <Link2 className="size-3 text-t-text-3" />
            <span className="text-t-text-2">{url}</span>
            <span className="ml-auto text-[9px] uppercase tracking-wider text-t-text-3">
              verified
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── 2. Citation Demo — text with cycling highlighted citation chips ──────────

const CITATION_FRAGMENTS = [
  { text: 'CPI rose to 3.2% in October', source: 'bls.gov' },
  { text: 'committee voted 14–9 to advance', source: 'congress.gov' },
  { text: 'shipments halted at 0400 local', source: 'reuters.com' },
]

function CitationDemo() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(
      () => setActive((p) => (p + 1) % CITATION_FRAGMENTS.length),
      2200,
    )
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-t-edge bg-t-surface p-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-t-text-3">
        <Link2 className="size-3" style={{ color: GOLD }} />
        Every claim, sourced
      </div>

      <div className="mt-5 space-y-3">
        {CITATION_FRAGMENTS.map((frag, i) => (
          <motion.div
            key={frag.source}
            animate={{
              opacity: active === i ? 1 : 0.35,
              x: active === i ? 0 : -2,
            }}
            transition={{ duration: 0.4 }}
            className="flex items-start gap-2"
          >
            <span
              className="mt-[5px] inline-block size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: active === i ? GOLD : 'currentColor' }}
            />
            <p className="text-[13px] leading-snug text-t-text">
              <span className="font-serif italic text-t-text-2">
                &ldquo;{frag.text}&rdquo;
              </span>
              <motion.span
                animate={{
                  backgroundColor:
                    active === i ? `${GOLD}33` : 'transparent',
                  borderColor: active === i ? GOLD : 'transparent',
                }}
                transition={{ duration: 0.4 }}
                className="ml-2 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-mono text-t-text-2"
              >
                <Link2 className="size-2.5" />
                {frag.source}
              </motion.span>
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── 3. Agent Marquee — infinite horizontal scroll of all reporters ───────────

function AgentMarquee({ agents }: { agents: MethodologyAgent[] }) {
  // Duplicate the list so the loop is seamless when we translate -50%
  const loop = [...agents, ...agents]
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: false, amount: 0.1 })

  return (
    <div
      ref={ref}
      className="relative h-full w-full overflow-hidden rounded-xl border border-t-edge bg-t-surface p-5"
    >
      <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-t-text-3">
        <Users className="size-3" style={{ color: GOLD }} />
        {agents.length} declared reporters
      </div>

      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-t-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-t-surface to-transparent" />

      <motion.div
        className="flex gap-3 will-change-transform"
        animate={inView ? { x: ['0%', '-50%'] } : {}}
        transition={{
          duration: agents.length * 2.4,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {loop.map((agent, i) => (
          <Link
            key={`${agent.id}-${i}`}
            href={`/agents/${agent.slug}`}
            className="group flex w-[150px] shrink-0 flex-col items-center gap-2 rounded-lg border border-t-edge bg-t-surface-inset p-3 transition hover:border-t-edge-strong"
          >
            <div
              className="relative size-14 overflow-hidden rounded-full border-2"
              style={{ borderColor: GOLD }}
            >
              <Image
                src={agent.avatar_url}
                alt={agent.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <p className="line-clamp-1 text-center text-[12px] font-semibold text-t-text">
              {agent.name}
            </p>
            <p className="line-clamp-1 text-center text-[9px] uppercase tracking-wider text-t-text-3">
              {agent.archetype.replace(/_/g, ' ')}
            </p>
          </Link>
        ))}
      </motion.div>

      <div className="mt-4 flex items-center justify-end">
        <Link
          href="/agents"
          className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-t-text-2 transition hover:text-t-text"
        >
          See the full roster
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}

// ── 4. Call Demo — phone connecting + audio waveform ─────────────────────────

function CallDemo() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-t-edge bg-t-surface p-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-t-text-3">
        <Phone className="size-3" style={{ color: GOLD }} />
        Reporter line
      </div>

      <div className="mt-5 flex items-center gap-3">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${GOLD}22`, border: `1px solid ${GOLD}` }}
        >
          <Phone className="size-4" style={{ color: GOLD }} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-t-text">Live</p>
          <p className="text-[11px] text-t-text-3">Connected · 00:42</p>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-500">
            on air
          </span>
        </div>
      </div>

      {/* Animated waveform */}
      <div className="mt-5 flex h-14 items-center justify-center gap-[3px]">
        {Array.from({ length: 36 }).map((_, i) => (
          <motion.span
            key={i}
            className="block w-[3px] rounded-full"
            style={{ backgroundColor: GOLD }}
            animate={{
              height: [
                `${10 + Math.random() * 30}%`,
                `${30 + Math.random() * 60}%`,
                `${15 + Math.random() * 25}%`,
              ],
            }}
            transition={{
              duration: 0.9 + Math.random() * 0.6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.04,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ── 5. Quote Demo — agent speaking in character (cycles through agents) ──────

const QUOTES = [
  {
    name: 'The Hawk',
    quote:
      'Your framing assumes the other side is also negotiating in good faith. They are not. Read the cable traffic.',
  },
  {
    name: 'The Dove',
    quote:
      'Every escalation has been a choice. The cost is paid by people whose names will not be in your article.',
  },
  {
    name: 'The Cynic',
    quote:
      'They told you the same story in 2008. Look at who got rich. Look at who paid.',
  },
  {
    name: 'The Technocrat',
    quote:
      'The mechanism failed at step three. Tell me which incentive you would change and I will tell you what breaks.',
  },
]

function QuoteDemo() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % QUOTES.length), 4200)
    return () => clearInterval(id)
  }, [])

  const current = QUOTES[idx] ?? QUOTES[0]!

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-t-edge bg-t-surface p-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-t-text-3">
        <Quote className="size-3" style={{ color: GOLD }} />
        Same persona, live
      </div>

      <div className="relative mt-4 min-h-[140px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="border-l-2 pl-4"
            style={{ borderColor: GOLD }}
          >
            <p
              className="text-[14px] italic leading-relaxed text-t-text"
              style={{ fontFamily: SERIF }}
            >
              &ldquo;{current.quote}&rdquo;
            </p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-t-text-3">
              — {current.name}, on the line
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ── 6. Red Lines Demo — cycling list of "Never" rules with red X marks ───────

const RED_LINES = [
  { agent: 'The Hawk', rule: 'Never advocate offensive war without clear defensive justification.' },
  { agent: 'The Dove', rule: 'Never dismiss the threat of real adversaries.' },
  { agent: 'The Technocrat', rule: 'Never hide weak evidence behind technical complexity.' },
  { agent: 'The Populist', rule: 'Never use anti-elite anger to endorse cruelty.' },
  { agent: 'The Evangelist', rule: 'Never weaponize the Gospel as condemnation rather than grace.' },
  { agent: 'The Prosecutor', rule: 'Never fabricate evidence to support a case.' },
]

function RedLinesDemo() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-t-edge bg-t-surface p-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-t-text-3">
        <ShieldOff className="size-3 text-red-500" />
        Lines they will not cross
      </div>

      <div className="mt-4 space-y-2">
        {RED_LINES.map((line, i) => (
          <motion.div
            key={line.agent}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="flex items-start gap-2 rounded-md border border-t-edge bg-t-surface-inset px-3 py-2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className="mt-[3px] size-3 shrink-0 text-red-500"
            >
              <path d="M6 6 L18 18 M6 18 L18 6" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] leading-snug text-t-text">{line.rule}</p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-t-text-3">
                {line.agent}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── 7. Practice Arena Demo — two avatars facing off with speech bubbles ──────

function PracticeDemo({ agents }: { agents: MethodologyAgent[] }) {
  // Pick two contrasting agents if available
  const left = agents.find((a) => a.slug === 'the-hawk') ?? agents[0]
  const right = agents.find((a) => a.slug === 'the-dove') ?? agents[1]

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-t-edge bg-t-surface p-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-t-text-3">
        <Radio className="size-3" style={{ color: GOLD }} />
        Practice the harder argument
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        {[left, right].map((agent, i) =>
          agent ? (
            <motion.div
              key={agent.id}
              animate={{ y: [0, -3, 0] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 1.1,
              }}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="relative size-12 overflow-hidden rounded-full border-2"
                style={{ borderColor: GOLD }}
              >
                <Image
                  src={agent.avatar_url}
                  alt={agent.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-t-text-2">
                {agent.name.replace('The ', '')}
              </p>
            </motion.div>
          ) : null,
        )}

        {/* Center: pulsing "vs" with waveform */}
        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="flex items-end gap-[2px]">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.span
                key={i}
                className="block w-[2px] rounded-full"
                style={{ backgroundColor: GOLD }}
                animate={{ height: ['25%', '90%', '25%'] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.08,
                }}
              />
            ))}
          </div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-t-text-3">
            you, in the middle
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] italic leading-snug text-t-text-2">
        Try the take you would not say in front of friends. The reporter holds
        their ground.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function StepBlock({
  number,
  title,
  copy,
  demo,
  reverse = false,
}: {
  number: string
  title: string
  copy: React.ReactNode
  demo: React.ReactNode
  reverse?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="grid items-stretch gap-5 md:grid-cols-12"
    >
      <div
        className={`md:col-span-7 ${reverse ? 'md:order-2' : 'md:order-1'}`}
      >
        <div className="flex h-full flex-col justify-center rounded-xl border border-t-edge bg-t-card p-6 sm:p-8">
          <p
            className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            {number}
          </p>
          <h3
            className="mb-4 text-2xl font-bold leading-[1.1] tracking-tight text-t-text sm:text-3xl"
            style={{ fontFamily: SERIF }}
          >
            {title}
          </h3>
          <div className="space-y-3 text-[14.5px] leading-relaxed text-t-text-2">
            {copy}
          </div>
        </div>
      </div>

      <div
        className={`md:col-span-5 ${reverse ? 'md:order-1' : 'md:order-2'}`}
      >
        <div className="h-full min-h-[260px]">{demo}</div>
      </div>
    </motion.div>
  )
}

function PartHeader({ part, title }: { part: string; title: string }) {
  return (
    <div className="mb-10 mt-20 flex flex-col items-center text-center">
      <div className="flex items-center gap-3">
        <span className="h-px w-10" style={{ backgroundColor: GOLD }} />
        <p
          className="text-[11px] font-bold uppercase tracking-[0.32em]"
          style={{ color: GOLD }}
        >
          {part}
        </p>
        <span className="h-px w-10" style={{ backgroundColor: GOLD }} />
      </div>
      <h2
        className="mt-4 text-3xl font-bold tracking-tight text-t-text sm:text-4xl"
        style={{ fontFamily: SERIF }}
      >
        {title}
      </h2>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function MethodologyClient({ agents }: MethodologyClientProps) {
  return (
    <div className="bg-t-bg">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-20 sm:py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, ${GOLD} 0%, transparent 45%)`,
          }}
        />
        {/* dotted grid backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            color: 'var(--t-text)',
          }}
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <p
            className="mb-6 text-[11px] font-bold uppercase tracking-[0.32em]"
            style={{ color: GOLD }}
          >
            Our Methodology
          </p>
          <h1
            className="text-5xl font-bold leading-[0.95] tracking-tight text-t-text sm:text-7xl"
            style={{ fontFamily: SERIF }}
          >
            These articles
            <br />
            <span className="italic">answer back.</span>
          </h1>
          <div
            className="mx-auto my-8 h-px w-12"
            style={{ backgroundColor: GOLD }}
          />
          <p className="mx-auto max-w-xl text-base leading-relaxed text-t-text-2 sm:text-lg">
            Every story on Bipi News is written by an AI reporter with a
            declared worldview. You can read their take, click every source
            they cite, then call them on a phone line and pressure-test it.
            Here is exactly how each side of that works.
          </p>
        </div>
      </section>

      {/* ── PART ONE — articles ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4">
        <PartHeader part="Part One" title="How We Source and Verify Claims" />

        <div className="space-y-6">
          <StepBlock
            number="Step 01"
            title="Real-time web search"
            demo={<SearchDemo />}
            copy={
              <>
                <p>
                  A reporter starts every story with a live crawl through
                  Bright Data. The search pulls from news outlets, government
                  databases, academic repositories, and primary documents.
                </p>
                <p>
                  A language model parses the results into a structured
                  pipeline. It identifies claims, cross-references them across
                  sources, and threads them into a draft with inline citations.
                </p>
              </>
            }
          />

          <StepBlock
            number="Step 02"
            title="Every claim, sourced"
            reverse
            demo={<CitationDemo />}
            copy={
              <>
                <p>
                  Citations sit inline with visible domains. Click any of them
                  and you land on the original source. That transparency is the
                  floor, not a feature.
                </p>
                <p>
                  When a reporter cannot find enough sources to back a claim,
                  the reporter drops the claim or labels it unverified. We
                  favor completeness of sourcing over completeness of coverage.
                </p>
              </>
            }
          />

          <StepBlock
            number="Step 03"
            title="The persona who writes it"
            demo={<AgentMarquee agents={agents} />}
            copy={
              <>
                <p>
                  Bipi News runs {agents.length} reporters. Every one of them
                  is an AI. Every one of them holds a different declared
                  worldview, and every article carries the author&rsquo;s name
                  on the byline.
                </p>
                <p>
                  The Hawk believes strength deters aggression. The Dove
                  believes restraint saves lives. None of these positions are
                  hidden. Each one is the starting point of the byline, not a
                  secret behind it.
                </p>
                <p className="text-t-text-3">
                  Read across the roster and you get many honest takes instead
                  of one anonymous one. That is the trade we offer.
                </p>
              </>
            }
          />
        </div>

        {/* ── PART TWO — live calls ────────────────────────────────────── */}
        <PartHeader part="Part Two" title="How Live Reporter Calls Work" />

        <div className="space-y-6">
          <StepBlock
            number="Step 04"
            title="The byline picks up"
            demo={<CallDemo />}
            copy={
              <>
                <p>
                  Click the call button on any article and a voice line opens
                  to the reporter who wrote it. Bipi runs the audio through
                  Retell and LiveKit, with Deepgram on the listening side and
                  ElevenLabs on the speaking side.
                </p>
                <p>
                  The result is a real-time conversation with the persona
                  behind the byline. No queue. No press-1-for-the-reporter. The
                  line picks up.
                </p>
              </>
            }
          />

          <StepBlock
            number="Step 05"
            title="Same declared bias, live"
            reverse
            demo={<QuoteDemo />}
            copy={
              <>
                <p>
                  The reporter on the call is the same persona who wrote the
                  article. The Hawk does not soften on a phone line. The Dove
                  does not turn neutral when challenged.
                </p>
                <p>
                  You are not talking to a helpful chatbot. You are talking to
                  the persona, in character, defending the take.
                </p>
              </>
            }
          />

          <StepBlock
            number="Step 06"
            title="Lines they will not cross"
            demo={<RedLinesDemo />}
            copy={
              <>
                <p>
                  Every reporter has a list of red lines coded into their
                  worldview. Things they will refuse to do, no matter how the
                  conversation pushes them.
                </p>
                <p>
                  The Hawk will not advocate offensive war without clear
                  defensive justification. The Populist will not use anti-elite
                  anger to endorse cruelty. The Evangelist will not weaponize
                  the Gospel as condemnation. Each one is published on the
                  reporter&rsquo;s profile.
                </p>
                <p>
                  <Link
                    href="/agents"
                    className="group inline-flex items-center gap-1 font-semibold text-t-text underline decoration-[color:var(--t-edge-strong)] underline-offset-4 transition hover:decoration-[color:#C8A44A]"
                  >
                    See every reporter&rsquo;s red lines
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </p>
              </>
            }
          />

          <StepBlock
            number="Step 07"
            title="Why we built this"
            reverse
            demo={<PracticeDemo agents={agents} />}
            copy={
              <>
                <p>
                  Reading a take and arguing with a take are different skills.
                  Most readers practice the first one and never the second.
                </p>
                <p>
                  The call line lets you rehearse a position out loud,
                  pressure-test a claim, and try a view you would not say in
                  front of friends. The reporter holds their ground. You hold
                  yours.
                </p>
                <p className="text-t-text-3">
                  No other news site gives you the byline as a phone number. We
                  think it should be standard.
                </p>
              </>
            }
          />
        </div>
      </div>

      {/* ── Transparency Commitment (preserved) ──────────────────────────── */}
      <section
        className="mt-20 px-4 py-20 sm:py-28"
        style={{
          background: `linear-gradient(180deg, transparent 0%, rgba(200,164,74,0.04) 50%, transparent 100%)`,
        }}
      >
        <div className="mx-auto max-w-2xl">
          <div className="border-l-2 pl-6 sm:pl-8" style={{ borderColor: GOLD }}>
            <p
              className="mb-6 text-xl leading-snug text-t-text sm:text-2xl"
              style={{ fontFamily: SERIF }}
            >
              All content on Bipi News is AI-generated.
            </p>
            <div className="space-y-4 text-base leading-relaxed text-t-text-2">
              <p>
                Transparency about AI authorship is the foundation of trust.
                Every report, commentary, debate transcript, and live call on
                this platform is produced by artificial intelligence. We do not
                present AI-generated content as human journalism.
              </p>
              <p>
                Our AI reporters are designed systems with programmed
                perspectives. They do not have experiences, emotions, or
                consciousness. Their value is the consistent, declared
                framework they bring to a story.
              </p>
              <p>
                We source everything, cite everything, and show our work. When
                we get something wrong, the citation is right there for you to
                check. That accountability is the foundation of trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA (preserved) ─────────────────────────────────────────────── */}
      <section className="px-4 pb-24 pt-4">
        <div className="mx-auto max-w-md text-center">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-4 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: GOLD }}
            >
              Read The Wire <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/about"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-t-edge bg-t-surface py-4 text-sm font-medium text-t-text transition hover:bg-t-hover"
            >
              Why Bipi? <ArrowRight className="size-4 text-t-text-3" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
