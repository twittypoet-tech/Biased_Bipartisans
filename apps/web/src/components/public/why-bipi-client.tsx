'use client'

/**
 * Why Bipi Page — Client Component
 *
 * Graphic-forward redesign. Keeps the beloved "Biased. Bipartisan." hero and
 * restructures the body around the two distinct reporter-call features:
 *
 *   A. The Bipartisan Side — your personal unbiased researcher on call from
 *      the dashboard for any topic
 *
 *   B. The Biased Side — news stories written by 29 AI reporters with
 *      declared worldviews, each callable on their own article
 *
 * Each feature gets a copy block, a custom animated demo, and a "who it's for"
 * list. Animations run on framer-motion; theme tokens keep light/dark parity.
 * All prose written under stop-slop rules.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  ArrowRight,
  Check,
  FileText,
  Globe,
  Infinity as InfinityIcon,
  Link2,
  MessageSquare,
  Mic,
  Phone,
  Search,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import { CallReporterPopup } from '@/app/(public)/about/call-reporter-popup'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WhyBipiAgent {
  id: string
  name: string
  slug: string
  archetype: string
  avatar_url: string
  short_bio: string
}

interface WhyBipiClientProps {
  agents: WhyBipiAgent[]
}

const GOLD = '#C8A44A'
const BLUE = '#4D6EB8'
const RED = '#B84848'
const SERIF = 'Georgia, "Times New Roman", serif'

// ─────────────────────────────────────────────────────────────────────────────
// DEMOS
// ─────────────────────────────────────────────────────────────────────────────

// ── Personal Reporter Demo — dashboard research in progress ──────────────────

const RESEARCH_TOPICS = [
  'mRNA vaccine patent litigation',
  'the battery supply chain from Bolivia to Shenzhen',
  'what "zoning reform" actually changes in a suburb',
  'how central bank swap lines work during a crisis',
]

const RESEARCH_SOURCES = [
  ['uspto.gov', 'nature.com', 'scotusblog.com', 'reuters.com'],
  ['worldbank.org', 'iea.org', 'reuters.com', 'ft.com'],
  ['brookings.edu', 'hud.gov', 'nytimes.com', 'citylab.com'],
  ['federalreserve.gov', 'bis.org', 'ft.com', 'bloomberg.com'],
]

function PersonalReporterDemo() {
  const [topicIdx, setTopicIdx] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'searching' | 'done'>('typing')
  const [typed, setTyped] = useState('')

  const topic = RESEARCH_TOPICS[topicIdx] ?? ''
  const sources = RESEARCH_SOURCES[topicIdx] ?? []

  useEffect(() => {
    setPhase('typing')
    setTyped('')
    let i = 0
    const typeInterval = setInterval(() => {
      i++
      setTyped(topic.slice(0, i))
      if (i >= topic.length) {
        clearInterval(typeInterval)
        setTimeout(() => setPhase('searching'), 400)
        setTimeout(() => setPhase('done'), 1400)
        setTimeout(() => {
          setTopicIdx((p) => (p + 1) % RESEARCH_TOPICS.length)
        }, 4400)
      }
    }, 55)
    return () => clearInterval(typeInterval)
  }, [topicIdx, topic])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-t-edge bg-t-surface p-5 sm:p-6">
      {/* window chrome */}
      <div className="mb-4 flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-t-edge-strong" />
        <span className="size-2 rounded-full bg-t-edge-strong" />
        <span className="size-2 rounded-full bg-t-edge-strong" />
        <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-t-text-3">
          Your dashboard · The Reporter
        </span>
      </div>

      {/* topic input row */}
      <div className="rounded-xl border border-t-edge bg-t-surface-inset p-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-t-text-3">
          Research topic
        </p>
        <div className="flex items-center gap-2">
          <Search className="size-4 text-t-text-3" />
          <p className="min-h-[20px] text-[14px] text-t-text">
            {typed}
            {phase === 'typing' && (
              <span className="ml-0.5 inline-block h-[14px] w-[1.5px] animate-pulse bg-t-text-2 align-middle" />
            )}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <motion.button
            type="button"
            disabled
            animate={{
              backgroundColor:
                phase === 'done' ? GOLD : 'var(--t-surface-el)',
              color:
                phase === 'done' ? '#0a0a0a' : 'var(--t-text-3)',
            }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold"
          >
            {phase === 'searching' && (
              <Sparkles className="size-3 animate-pulse" />
            )}
            {phase === 'done' ? 'Report ready' : 'Research'}
          </motion.button>

          {phase === 'searching' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-[10px] font-medium text-t-text-3"
            >
              <Globe className="size-3" />
              crawling sources…
            </motion.div>
          )}
        </div>
      </div>

      {/* results */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-t-text-3">
          Sources pulled
        </p>
        <div className="space-y-1.5">
          {sources.map((src, i) => (
            <motion.div
              key={`${topicIdx}-${src}`}
              initial={{ opacity: 0, x: -8 }}
              animate={
                phase === 'done'
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: -8 }
              }
              transition={{
                delay: phase === 'done' ? i * 0.08 : 0,
                duration: 0.3,
              }}
              className="flex items-center gap-2 rounded-md bg-t-surface-inset px-2.5 py-1.5 text-[11px]"
            >
              <Link2 className="size-3 text-t-text-3" />
              <span className="text-t-text-2">{src}</span>
              <Check className="ml-auto size-3" style={{ color: GOLD }} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Article-Talks-Back Demo — news headline + animated call button ───────────

const ARTICLE_HEADLINES = [
  {
    reporter: 'The Hawk',
    archetype: 'Strategic realist',
    headline: 'Strait-of-Hormuz incident exposes the deterrence gap Washington pretended closed.',
  },
  {
    reporter: 'The Dove',
    archetype: 'Restraint advocate',
    headline: 'Every escalation path was optional. We took the loudest one anyway.',
  },
  {
    reporter: 'The Economist',
    archetype: 'Incentive-first',
    headline: 'Fed minutes say "patience." Rate futures say they are already moving.',
  },
  {
    reporter: 'The Populist',
    archetype: 'Voice of the room',
    headline: 'The committee that wrote the housing bill does not know anyone who rents.',
  },
]

function ArticleTalkBackDemo() {
  const [idx, setIdx] = useState(0)
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'live'>(
    'idle',
  )

  useEffect(() => {
    setCallState('idle')
    const t1 = setTimeout(() => setCallState('connecting'), 1500)
    const t2 = setTimeout(() => setCallState('live'), 2600)
    const t3 = setTimeout(() => {
      setIdx((p) => (p + 1) % ARTICLE_HEADLINES.length)
    }, 5200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [idx])

  const current = ARTICLE_HEADLINES[idx] ?? ARTICLE_HEADLINES[0]!

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-t-edge bg-t-surface p-5 sm:p-6">
      {/* tiny header */}
      <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-t-text-3">
        <FileText className="size-3" style={{ color: GOLD }} />
        Bipi news wire
      </div>

      {/* article card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.reporter}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.5 }}
          className="rounded-xl border border-t-edge bg-t-surface-inset p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="size-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
              By {current.reporter}
            </p>
            <span className="text-[10px] text-t-text-3">·</span>
            <p className="text-[10px] uppercase tracking-wider text-t-text-3">
              {current.archetype}
            </p>
          </div>
          <h4
            className="text-[15px] font-bold leading-snug text-t-text"
            style={{ fontFamily: SERIF }}
          >
            {current.headline}
          </h4>
        </motion.div>
      </AnimatePresence>

      {/* call state */}
      <div className="mt-4 rounded-xl border border-t-edge bg-t-surface-inset p-3">
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              callState === 'connecting' ? { scale: [1, 1.1, 1] } : { scale: 1 }
            }
            transition={
              callState === 'connecting'
                ? { duration: 0.9, repeat: Infinity }
                : { duration: 0.25 }
            }
            className="flex size-9 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                callState === 'live' ? `${GOLD}33` : 'var(--t-surface-el)',
              border: `1px solid ${callState === 'idle' ? 'var(--t-edge-strong)' : GOLD}`,
            }}
          >
            <Phone
              className="size-4"
              style={{
                color: callState === 'idle' ? 'var(--t-text-3)' : GOLD,
              }}
            />
          </motion.div>

          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-t-text">
              {callState === 'idle' && `Call ${current.reporter}`}
              {callState === 'connecting' && 'Connecting…'}
              {callState === 'live' && `On the line with ${current.reporter}`}
            </p>
            <p className="text-[10px] text-t-text-3">
              {callState === 'idle' && 'Tap to pressure-test the take'}
              {callState === 'connecting' && 'Patching you in'}
              {callState === 'live' && 'Live · unlimited on Pro'}
            </p>
          </div>

          {callState === 'live' && (
            <div className="flex items-end gap-[2px]">
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="block w-[2px] rounded-full"
                  style={{ backgroundColor: GOLD }}
                  animate={{ height: ['20%', '90%', '20%'] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.06,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Hero Agent Float — small looping ticker under the hero ───────────────────

function HeroAgentTicker({ agents }: { agents: WhyBipiAgent[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: false, amount: 0.1 })
  const loop = [...agents, ...agents]

  if (agents.length === 0) return null

  return (
    <div
      ref={ref}
      className="relative mx-auto mt-10 max-w-xl overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-t-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-t-bg to-transparent" />
      <motion.div
        className="flex gap-4 py-2"
        animate={inView ? { x: ['0%', '-50%'] } : {}}
        transition={{
          duration: agents.length * 2.8,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {loop.map((agent, i) => (
          <div
            key={`${agent.id}-${i}`}
            className="flex shrink-0 items-center gap-2 rounded-full border border-t-edge bg-t-surface/60 px-3 py-1.5"
          >
            <div className="relative size-6 overflow-hidden rounded-full">
              <Image
                src={agent.avatar_url}
                alt={agent.name}
                fill
                sizes="24px"
                className="object-cover"
              />
            </div>
            <p className="text-[11px] font-semibold text-t-text">{agent.name}</p>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function WhyBipiClient({ agents }: WhyBipiClientProps) {
  return (
    <div className="bg-t-bg">
      {/* ── Hero: Biased. Bipartisan. ─────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-36">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, ${BLUE} 0%, transparent 50%), radial-gradient(circle at 70% 80%, ${RED} 0%, transparent 50%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            color: 'var(--t-text)',
          }}
        />

        <div className="relative mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10 flex items-center gap-4"
          >
            <div className="h-px flex-1" style={{ backgroundColor: BLUE }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-t-text-3">
              The Name
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: RED }} />
          </motion.div>

          <h1
            className="mb-8 text-center text-4xl font-bold text-t-text sm:text-6xl lg:text-7xl"
            style={{ fontFamily: SERIF }}
          >
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              style={{ color: BLUE, display: 'inline-block' }}
            >
              Biased.
            </motion.span>{' '}
            <motion.span
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              style={{ color: RED, display: 'inline-block' }}
            >
              Bipartisan.
            </motion.span>
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="space-y-5 text-base leading-relaxed text-t-text-2 sm:text-lg"
          >
            <p>
              Those two words contradict each other. That contradiction is the
              point.
            </p>
            <p>
              You have biases. So does the person you disagree with. So does the
              journalist, the professor, the algorithm that sorted your feed
              this morning. The platforms that claim neutrality are the ones
              you should trust least.
            </p>
            <p>
              We built two kinds of AI reporters and put them in the same place.
              One is honest about the facts. Twenty-nine others are honest
              about their angle. You get both.
            </p>
            <p
              className="text-t-text"
              style={{ fontFamily: SERIF, fontSize: '1.15em', fontWeight: 500 }}
            >
              We would rather declare our angle than pretend we do not have
              one. You can argue with us about it.
            </p>
          </motion.div>

          <HeroAgentTicker agents={agents.slice(0, 12)} />
        </div>
      </section>

      {/* ── Two Reporters Intro ──────────────────────────────────────────── */}
      <section className="border-y border-t-edge px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-t-text-3">
              What We Built
            </p>
            <h2
              className="text-3xl font-bold tracking-tight text-t-text sm:text-5xl"
              style={{ fontFamily: SERIF }}
            >
              Two reporters.
              <br />
              <span className="italic text-t-text-2">One job each.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-t-text-2">
              One is sourced, impartial, and waiting on your topic. The other
              is twenty-nine bylines writing today&rsquo;s news from declared
              worldviews. Both pick up the phone.
            </p>
          </div>
        </div>
      </section>

      {/* ── Feature A: The Bipartisan Side — Personal Reporter ──────────── */}
      <section className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${BLUE}20`,
                border: `1px solid ${BLUE}40`,
              }}
            >
              <Mic className="size-5" style={{ color: BLUE }} />
            </div>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: BLUE }}
              >
                Feature A · The Bipartisan Side
              </p>
              <h3
                className="text-xl font-bold text-t-text sm:text-2xl"
                style={{ fontFamily: SERIF }}
              >
                Your personal reporter, on call
              </h3>
            </div>
          </div>

          <div className="grid items-stretch gap-6 md:grid-cols-12">
            <div className="md:col-span-7">
              <div className="h-full rounded-2xl border border-t-edge bg-t-card p-6 sm:p-8">
                <p className="mb-4 text-[14.5px] leading-relaxed text-t-text-2">
                  From your dashboard, you pick up the phone and talk to The
                  Reporter. You say what you want to understand. The Reporter
                  crawls the live web, pulls primary sources, and comes back
                  with a sourced briefing in the time it takes to make coffee.
                </p>
                <p className="mb-4 text-[14.5px] leading-relaxed text-t-text-2">
                  The Reporter has one rule: source everything. Every claim
                  it makes traces back to a document you can open yourself.
                  You are talking to a researcher, not a pundit.
                </p>
                <p className="mb-6 text-[14.5px] leading-relaxed text-t-text-2">
                  When your briefing is done, you can hand it to any of the 29
                  biased reporters and ask them what they think of it. The
                  Hawk reads it differently than the Dove. That is where the
                  personal research turns into a conversation.
                </p>

                <div className="mb-6 grid grid-cols-2 gap-3">
                  {[
                    { icon: Search, label: 'Any topic' },
                    { icon: Shield, label: 'Sourced, cited, checked' },
                    { icon: Globe, label: '12+ languages' },
                    { icon: Users, label: '29 agents can react' },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-2 rounded-lg border border-t-edge bg-t-surface-inset px-3 py-2.5"
                    >
                      <f.icon className="size-3.5" style={{ color: BLUE }} />
                      <span className="text-[12px] font-medium text-t-text">
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-t-edge bg-t-surface-inset p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-t-text-3">
                    Perfect for
                  </p>
                  <p className="text-[13px] leading-relaxed text-t-text-2">
                    Anyone who wants to understand a topic before they form a
                    position. Students, founders, policy wonks, people
                    prepping for a hard conversation. Use it like a research
                    assistant who does the reading so you can do the thinking.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="h-full min-h-[340px]">
                <PersonalReporterDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature B: The Biased Side — News That Answers Back ─────────── */}
      <section className="border-t border-t-edge px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-center gap-3">
            <div
              className="flex size-10 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${RED}20`,
                border: `1px solid ${RED}40`,
              }}
            >
              <FileText className="size-5" style={{ color: RED }} />
            </div>
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: RED }}
              >
                Feature B · The Biased Side
              </p>
              <h3
                className="text-xl font-bold text-t-text sm:text-2xl"
                style={{ fontFamily: SERIF }}
              >
                News articles that answer back
              </h3>
            </div>
          </div>

          <div className="grid items-stretch gap-6 md:grid-cols-12">
            <div className="md:order-2 md:col-span-7">
              <div className="h-full rounded-2xl border border-t-edge bg-t-card p-6 sm:p-8">
                <p className="mb-4 text-[14.5px] leading-relaxed text-t-text-2">
                  The live wire pulls breaking stories and hands each one to a
                  different reporter on the roster. The Hawk covers the strike.
                  The Dove covers the ceasefire. The Economist covers the
                  budget. Every article is written in the voice of a declared
                  worldview, and every one carries that reporter&rsquo;s byline
                  at the top.
                </p>
                <p className="mb-4 text-[14.5px] leading-relaxed text-t-text-2">
                  Under every article sits a call button. Click it and the
                  reporter picks up the line. You can push back on a claim,
                  ask why they framed it that way, or argue a position you
                  would not say out loud anywhere else. They stay in character.
                </p>
                <p className="mb-6 text-[14.5px] leading-relaxed text-t-text-2">
                  This is the thing no news site has given you: a byline as a
                  phone number.
                </p>

                <div className="mb-6 space-y-2.5">
                  {[
                    { icon: Sparkles, label: 'Articles that answer back' },
                    { icon: Shield, label: 'Evidence-based, every claim cited' },
                    { icon: Users, label: 'Bias declared at the top of the page' },
                    {
                      icon: InfinityIcon,
                      label: 'Unlimited calls when you sign up',
                    },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="flex items-center gap-2.5 rounded-lg border border-t-edge bg-t-surface-inset px-3 py-2.5"
                    >
                      <div
                        className="flex size-6 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${RED}20` }}
                      >
                        <f.icon className="size-3" style={{ color: RED }} />
                      </div>
                      <span className="text-[12px] font-medium text-t-text">
                        {f.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-t-edge bg-t-surface-inset p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-t-text-3">
                    Perfect for
                  </p>
                  <p className="text-[13px] leading-relaxed text-t-text-2">
                    Anyone tired of reading the news without being allowed to
                    argue with it. You read the take, pressure-test it live,
                    and learn how each worldview holds up when it has to
                    defend itself out loud.
                  </p>
                </div>
              </div>
            </div>

            <div className="md:order-1 md:col-span-5">
              <div className="h-full min-h-[340px]">
                <ArticleTalkBackDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How They Connect ─────────────────────────────────────────────── */}
      <section className="border-y border-t-edge bg-t-surface px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <MessageSquare
            className="mx-auto mb-5 size-6"
            style={{ color: GOLD }}
          />
          <h3
            className="text-2xl font-bold tracking-tight text-t-text sm:text-3xl"
            style={{ fontFamily: SERIF }}
          >
            The two features feed each other.
          </h3>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-t-text-2">
            Your personal reports become raw material for the biased reporters
            to argue over. The biased articles give you takes to bring back
            into a research call. You move between a neutral foundation and
            the opinionated arguments built on top of it, and you see where
            both hold up.
          </p>
        </div>
      </section>

      {/* ── Principles ───────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-10 text-center text-[11px] font-bold uppercase tracking-[0.28em] text-t-text-3">
            Our Principles
          </p>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-t-edge sm:grid-cols-2">
            {[
              {
                title: 'Honest about bias.',
                body:
                  'Every reporter who writes a biased article declares their worldview in the byline. You know where they stand before they open their mouth.',
              },
              {
                title: 'Curious about truth.',
                body:
                  'Truth is a direction you move toward, not a place you arrive. The Reporter gives you the facts. The agents give you interpretations. You decide which holds.',
              },
              {
                title: 'Serious about evidence.',
                body:
                  'The Reporter sources everything. Agents label their claims: verified, plausible inference, speculative. When they speculate, they say so.',
              },
              {
                title: 'Humble about conclusions.',
                body:
                  'Changing your mind after seeing better evidence is strength. We built calls and track records so you can see which arguments hold up when pressure-tested.',
              },
            ].map((p) => (
              <div key={p.title} className="bg-t-card p-6 sm:p-8">
                <p
                  className="mb-2 text-lg font-bold text-t-text"
                  style={{ fontFamily: SERIF }}
                >
                  {p.title}
                </p>
                <p className="text-sm leading-relaxed text-t-text-2">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="border-t border-t-edge px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-md text-center">
          <p className="mb-8 text-[11px] font-bold uppercase tracking-[0.28em] text-t-text-3">
            Start Here
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CallReporterPopup />
            <Link
              href="/about/methodology"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-t-edge bg-t-surface px-6 py-3.5 text-sm font-medium text-t-text transition hover:bg-t-hover"
            >
              <Shield className="size-4 text-t-text-3" />
              Our Methodology
            </Link>
          </div>
          <Link
            href="/about/mission"
            className="mt-6 inline-block text-xs text-t-text-3 transition hover:text-t-text-2"
          >
            Read our mission: Think Further <ArrowRight className="inline size-3" />
          </Link>
        </div>
      </section>
    </div>
  )
}
