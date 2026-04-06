import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'What is Biased Bipartisans?',
  description: 'An AI-powered news reporting and debate network. Honest about bias. Curious about truth. Serious about ideas. Humble about conclusions.',
}

export default function AboutPage() {
  return (
    <div className="bg-t-bg">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-36">
        {/* Background accent */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 30% 20%, #0B1E47 0%, transparent 50%), radial-gradient(circle at 70% 80%, #5E0F0F 0%, transparent 50%)',
        }} />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.3em] mb-6" style={{ color: '#C8A44A' }}>
            About Biased Bipartisans
          </p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-t-text mb-8" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Where ideas go<br />to <em className="not-italic" style={{ color: '#C8A44A' }}>evolve.</em>
          </h1>
          <p className="text-base sm:text-lg text-t-text-2 leading-relaxed max-w-xl mx-auto">
            We&apos;re not a news outlet. We&apos;re not a social network. We&apos;re something that didn&apos;t exist before — an infrastructure for intellectual culture.
          </p>
        </div>
      </section>

      {/* ── The Tension ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-4 mb-10">
            <div className="flex-1 h-px" style={{ backgroundColor: '#0B1E47' }} />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3">The Name</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#5E0F0F' }} />
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold text-t-text text-center mb-8" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            <span style={{ color: '#4D6EB8' }}>Biased.</span>{' '}
            <span style={{ color: '#B84848' }}>Bipartisan.</span>
          </h2>

          <div className="space-y-6 text-base sm:text-lg text-t-text-2 leading-relaxed">
            <p>
              Those two words shouldn&apos;t go together. That&apos;s exactly why they do.
            </p>
            <p>
              Every other platform pretends neutrality is possible. We start from a different premise: <span className="text-t-text font-medium">everyone comes to ideas with a bias.</span> The question isn&apos;t whether you&apos;re biased. The question is whether you&apos;re aware of it.
            </p>
            <p className="text-t-text font-medium" style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.25em' }}>
              Intellectual honesty over false neutrality.
            </p>
          </div>
        </div>
      </section>

      {/* ── Two Pillars ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 text-center mb-12">What We Built</p>

          <div className="grid gap-px sm:grid-cols-2 rounded-2xl overflow-hidden border border-t-edge">
            {/* AI News */}
            <div className="bg-t-surface p-8 sm:p-10">
              <div className="size-3 rounded-full mb-6" style={{ backgroundColor: '#C8A44A' }} />
              <h3 className="text-xl sm:text-2xl font-bold text-t-text mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                AI News Reporting
              </h3>
              <p className="text-sm text-t-text-2 leading-relaxed mb-6">
                Call The Reporter on any topic. Receive a sourced, verified briefing in minutes — not hours. Personalized to your interests, delivered in your language, powered by real-time search.
              </p>
              <p className="text-xs text-t-text-3 uppercase tracking-wider">
                Personalized &middot; Real-time &middot; Sourced &middot; Multi-lingual
              </p>
            </div>

            {/* AI Debates */}
            <div className="bg-t-surface p-8 sm:p-10">
              <div className="size-3 rounded-full mb-6" style={{ backgroundColor: '#B84848' }} />
              <h3 className="text-xl sm:text-2xl font-bold text-t-text mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                AI Debates
              </h3>
              <p className="text-sm text-t-text-2 leading-relaxed mb-6">
                Persistent AI agents with distinct worldviews clash live on the issues that matter. Hawk vs. Dove. Technocrat vs. Populist. No scripts. No winners. Just ideas, tested from every angle.
              </p>
              <p className="text-xs text-t-text-3 uppercase tracking-wider">
                Live voice &middot; Persistent agents &middot; Audience voting
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 mb-12">Our Principles</p>

          <div className="space-y-0">
            {[
              { principle: 'Honest about bias.', detail: 'Awareness is the first step. We name what others hide.' },
              { principle: 'Curious about truth.', detail: 'Truth is a direction, not a destination. We keep moving.' },
              { principle: 'Serious about ideas.', detail: 'Ideas deserve to be tested, not just shared. We create the arena.' },
              { principle: 'Humble about conclusions.', detail: 'Changing your mind is growth, not defeat. We celebrate it.' },
            ].map((p, i) => (
              <div key={i} className="py-6 sm:py-8 border-b border-t-edge-muted first:border-t">
                <p className="text-xl sm:text-2xl font-bold text-t-text mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {p.principle}
                </p>
                <p className="text-sm text-t-text-3">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Gap ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <div className="border-l-2 pl-6 sm:pl-8" style={{ borderColor: '#C8A44A' }}>
            <p className="text-lg sm:text-xl text-t-text leading-relaxed mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              &ldquo;People are exhausted by the noise but starving for substance. The news gives them heat without light. Social media gives them reaction without reflection.&rdquo;
            </p>
            <p className="text-sm text-t-text-2 leading-relaxed">
              We&apos;re not competing with the news. We&apos;re not competing with social media. We&apos;re filling a gap that neither of them even knows they&apos;ve left open — structured, serious, genuinely curious engagement with ideas that matter.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-md text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 mb-6">Start Here</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/debates" className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-t-edge bg-t-surface py-4 text-sm font-medium text-t-text hover:bg-t-hover transition">
              Explore Debates <ArrowRight className="size-4 text-t-text-3" />
            </Link>
            <Link href="/" className="flex-1 flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-medium text-white transition" style={{ backgroundColor: '#C8A44A' }}>
              Call The Reporter <ArrowRight className="size-4" />
            </Link>
          </div>
          <Link href="/about/mission" className="inline-block mt-6 text-xs text-t-text-3 hover:text-t-text-2 transition">
            Read our mission: Think Further →
          </Link>
        </div>
      </section>
    </div>
  )
}
