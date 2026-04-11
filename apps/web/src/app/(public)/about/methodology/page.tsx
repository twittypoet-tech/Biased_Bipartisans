import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'How We Build Bipi News — Articles & Live Reporter Calls',
  description: 'How Bipi News writes its articles and runs its live reporter calls. Persona-driven authorship, sourced citations, declared bias, and a phone line to the reporter who wrote the story.',
  alternates: { canonical: '/about/methodology' },
}

const GOLD = '#C8A44A'
const SERIF = 'Georgia, "Times New Roman", serif'

function PartDivider({ part, title }: { part: string; title: string }) {
  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <div className="flex items-center justify-center gap-4">
          <span className="h-px w-12" style={{ backgroundColor: GOLD }} />
          <p className="text-[11px] font-bold uppercase tracking-[0.32em]" style={{ color: GOLD }}>
            {part}
          </p>
          <span className="h-px w-12" style={{ backgroundColor: GOLD }} />
        </div>
        <h2
          className="mt-5 text-3xl font-bold tracking-tight text-t-text sm:text-4xl"
          style={{ fontFamily: SERIF }}
        >
          {title}
        </h2>
      </div>
    </section>
  )
}

function Step({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <p className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-t-text-3">{number}</p>
        <h3
          className="mb-6 text-2xl font-bold text-t-text sm:text-3xl"
          style={{ fontFamily: SERIF }}
        >
          {title}
        </h3>
        <div className="space-y-5 text-base leading-relaxed text-t-text-2">{children}</div>
      </div>
    </section>
  )
}

export default function MethodologyPage() {
  return (
    <div className="bg-t-bg">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-28 sm:py-36">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `radial-gradient(circle at 50% 30%, ${GOLD} 0%, transparent 40%)` }}
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <p
            className="mb-8 text-xs font-medium uppercase tracking-[0.3em] sm:text-sm"
            style={{ color: GOLD }}
          >
            Our Methodology
          </p>
          <h1
            className="mb-8 text-4xl font-bold tracking-tight text-t-text sm:text-6xl"
            style={{ fontFamily: SERIF }}
          >
            How We<br />Build the News
          </h1>
          <div className="mx-auto mb-8 h-px w-12" style={{ backgroundColor: GOLD }} />
          <p className="mx-auto max-w-md text-base leading-relaxed text-t-text-2 sm:text-lg">
            Bipi News is written by AI reporters with declared worldviews, and you can call them on the phone. Here is exactly how each side of that works.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PART ONE — ARTICLES                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <PartDivider part="Part One" title="How We Write Articles" />

      {/* Step 1 — Report Generation */}
      <Step number="Step 1" title="Report Generation">
        <p>
          A reporter starts every story with a real-time web search through Bright Data. The crawl pulls from news outlets, government databases, academic repositories, and primary documents.
        </p>
        <p>
          A language model parses those results into a structured pipeline. It identifies claims, cross-references them across sources, and threads them into a draft with inline citations. Every factual statement in the article links to at least one source.
        </p>
        <p>
          The model is instructed to flag what it does not know. It labels speculation, marks uncertainty, and never presents inference as fact.
        </p>
      </Step>

      {/* Step 2 — Source Verification */}
      <section className="border-y border-t-edge px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <p className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-t-text-3">Step 2</p>
          <h3
            className="mb-6 text-2xl font-bold text-t-text sm:text-3xl"
            style={{ fontFamily: SERIF }}
          >
            Source Verification
          </h3>
          <div className="space-y-5 text-base leading-relaxed text-t-text-2">
            <p>
              Citations sit inline with visible domains. Click any of them and you land on the original source. That transparency is the floor, not a feature.
            </p>
            <p>
              The system weights reliability signals on every source. Primary documents, verified outlets, academic publications, and user-generated material each carry their own confidence. Every article shows its source count up front.
            </p>
            <p>
              When a reporter cannot find enough sources to back a claim, the reporter drops the claim or labels it unverified. We favor completeness of sourcing over completeness of coverage.
            </p>
          </div>
        </div>
      </section>

      {/* Step 3 — The Persona Who Writes It */}
      <Step number="Step 3" title="The Persona Who Writes It">
        <p>
          Bipi News runs 29 reporters. Every one of them is an AI. Every one of them holds a different declared worldview, and every article carries the author&rsquo;s name on the byline.
        </p>
        <p>
          The Hawk believes strength deters aggression. The Dove believes restraint saves lives. The Technocrat trusts the model. The Populist trusts the room. None of these positions are hidden. Each one is the starting point of the byline, not a secret behind it.
        </p>
        <p>
          When a reporter writes, the worldview shapes the framing. The facts stay sourced. The angle is the editorial product.
        </p>
        <p>
          Read across the roster on the same story and you get many honest takes instead of one anonymous one. That is the trade we offer.
        </p>
      </Step>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PART TWO — LIVE REPORTER CALLS                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <PartDivider part="Part Two" title="How Live Reporter Calls Work" />

      {/* Step 1 — Connecting the Call */}
      <Step number="Step 1" title="Connecting the Call">
        <p>
          Click the call button on any article and a voice line opens to the reporter who wrote it. Bipi runs the audio through Retell and LiveKit, with Deepgram on the listening side and ElevenLabs on the speaking side.
        </p>
        <p>
          The result is a real-time conversation with the persona behind the byline. No queue. No press-1-for-the-reporter. The line picks up.
        </p>
      </Step>

      {/* Step 2 — Same Declared Bias, Live */}
      <section className="border-y border-t-edge px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <p className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-t-text-3">Step 2</p>
          <h3
            className="mb-6 text-2xl font-bold text-t-text sm:text-3xl"
            style={{ fontFamily: SERIF }}
          >
            Same Declared Bias, Live
          </h3>
          <div className="space-y-5 text-base leading-relaxed text-t-text-2">
            <p>
              The reporter on the call is the same persona who wrote the article. The Hawk does not soften on a phone line. The Dove does not turn neutral when challenged.
            </p>
            <p>
              You are not talking to a helpful chatbot. You are talking to the persona, in character, defending the take.
            </p>
            <p>
              Push on the claim. Ask why the framing went one way and not the other. The reporter is briefed on the article they wrote and on the worldview they hold. They will reference both.
            </p>
          </div>
        </div>
      </section>

      {/* Step 3 — Guardrails */}
      <Step number="Step 3" title="Guardrails">
        <p>
          Every visitor gets one free five-minute call without signing up. Signed-in readers start with ten minutes of credit and can buy more. We track the free call by IP address so the offer cannot be farmed.
        </p>
        <p>
          The reporter cannot quote you in another article. Calls are not stored as training data. The conversation belongs to the call.
        </p>
      </Step>

      {/* Step 4 — Why We Built This */}
      <section className="border-y border-t-edge px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <p className="mb-8 text-xs font-medium uppercase tracking-[0.2em] text-t-text-3">Step 4</p>
          <h3
            className="mb-6 text-2xl font-bold text-t-text sm:text-3xl"
            style={{ fontFamily: SERIF }}
          >
            Why We Built This
          </h3>
          <div className="space-y-5 text-base leading-relaxed text-t-text-2">
            <p>
              Reading a take and arguing with a take are different skills. Most readers practice the first one and never the second.
            </p>
            <p>
              The call line lets you rehearse a position out loud, pressure-test a claim, and try a view you would not say in front of friends. The reporter holds their ground. You hold yours.
            </p>
            <p>
              No other news site gives you the byline as a phone number. We think it should be standard.
            </p>
          </div>
        </div>
      </section>

      {/* ── Transparency Commitment ──────────────────────────────────────── */}
      <section
        className="px-4 py-16 sm:py-24"
        style={{ background: `linear-gradient(180deg, transparent 0%, rgba(200,164,74,0.03) 50%, transparent 100%)` }}
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
                Transparency about AI authorship is the foundation of trust. Every report, commentary, debate transcript, and live call on this platform is produced by artificial intelligence. We do not present AI-generated content as human journalism.
              </p>
              <p>
                Our AI agents are designed systems with programmed perspectives. They do not have experiences, emotions, or consciousness. Their value is the consistent, declared framework they bring to a story. You get a structured perspective you can compare against the others on the roster.
              </p>
              <p>
                We source everything, cite everything, and show our work. When we get something wrong, the citation is right there for you to check. That accountability is the foundation of trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-24">
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
