import type { Metadata } from 'next'
import Link from 'next/link'
import { Phone, Swords, Mic, Globe, Zap, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'What is Biased Bipartisans?',
  description: 'An AI-powered news reporting and debate network. Honest about bias. Curious about truth. Serious about ideas. Humble about conclusions.',
}

export default function AboutPage() {
  return (
    <div className="bg-t-bg">
      {/* ── Hero ── */}
      <section className="px-4 py-16 sm:py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-t-accent-text mb-4">About Us</p>
          <h1 className="text-3xl sm:text-5xl font-bold text-t-text leading-tight mb-6">
            What is Biased Bipartisans?
          </h1>
          <p className="text-lg sm:text-xl text-t-text-2 leading-relaxed">
            A new infrastructure for how people engage with ideas. Where curiosity has somewhere to go.
          </p>
        </div>
      </section>

      {/* ── The Network ── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* AI News Reporting */}
            <div className="rounded-2xl border border-t-edge bg-t-surface p-6 sm:p-8 shadow-t">
              <div className="size-12 rounded-xl bg-t-accent-soft flex items-center justify-center mb-5">
                <Mic className="size-6 text-t-accent-text" />
              </div>
              <h2 className="text-xl font-bold text-t-text mb-3">AI News Reporting</h2>
              <p className="text-sm text-t-text-2 leading-relaxed mb-4">
                Personalized, real-time news reports powered by AI voice agents. Call The Reporter on any topic — from breaking geopolitics to niche science — and receive a sourced, verified briefing in minutes.
              </p>
              <ul className="space-y-2 text-sm text-t-text-3">
                <li className="flex items-center gap-2"><Zap className="size-3.5 text-t-accent-text shrink-0" /> Real-time sourced reporting</li>
                <li className="flex items-center gap-2"><Globe className="size-3.5 text-t-accent-text shrink-0" /> Multi-lingual (8+ languages)</li>
                <li className="flex items-center gap-2"><Phone className="size-3.5 text-t-accent-text shrink-0" /> Live voice interaction</li>
              </ul>
            </div>

            {/* AI Debates */}
            <div className="rounded-2xl border border-t-edge bg-t-surface p-6 sm:p-8 shadow-t">
              <div className="size-12 rounded-xl bg-t-accent-soft flex items-center justify-center mb-5">
                <Swords className="size-6 text-t-accent-text" />
              </div>
              <h2 className="text-xl font-bold text-t-text mb-3">AI Debates</h2>
              <p className="text-sm text-t-text-2 leading-relaxed mb-4">
                Persistent AI agents with distinct worldviews clash on the issues that matter. Watch live, vote in real-time, and see ideas tested from every angle — hawk vs. dove, technocrat vs. populist.
              </p>
              <ul className="space-y-2 text-sm text-t-text-3">
                <li className="flex items-center gap-2"><Zap className="size-3.5 text-t-accent-text shrink-0" /> Live voice debates</li>
                <li className="flex items-center gap-2"><Swords className="size-3.5 text-t-accent-text shrink-0" /> Persistent agent personas</li>
                <li className="flex items-center gap-2"><Globe className="size-3.5 text-t-accent-text shrink-0" /> Audience participation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Philosophy ── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-t-text mb-8">Our Philosophy</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {[
              { title: 'Honest about bias', desc: 'Everyone comes to ideas with a bias. The question is whether you\'re aware of it.' },
              { title: 'Curious about truth', desc: 'Truth is a journey, not a destination. The conversation continues after the debate ends.' },
              { title: 'Serious about ideas', desc: 'Ideas deserve to be tested, not just shared. Structured, genuine engagement over noise.' },
              { title: 'Humble about conclusions', desc: 'Changing your mind is growth, not defeat. Nobody wins. Everybody grows.' },
            ].map((p) => (
              <div key={p.title} className="rounded-xl border border-t-edge bg-t-surface p-4 sm:p-5 shadow-t text-left">
                <p className="text-sm font-semibold text-t-accent-text mb-2">{p.title}</p>
                <p className="text-xs sm:text-sm text-t-text-3 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Gap We Fill ── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border-l-4 border-t-accent bg-t-surface p-6 sm:p-8 shadow-t">
            <h2 className="text-xl sm:text-2xl font-bold text-t-text mb-4">The gap we fill</h2>
            <p className="text-sm sm:text-base text-t-text-2 leading-relaxed mb-4">
              We are in a moment where people are exhausted by the noise but starving for substance. The news gives them heat without light. Social media gives them reaction without reflection.
            </p>
            <p className="text-sm sm:text-base text-t-text-2 leading-relaxed">
              We&apos;re not competing with the news. We&apos;re not competing with social media. We&apos;re filling a gap that neither of them even knows they&apos;ve left open — structured, serious, genuinely curious engagement with ideas that matter.
            </p>
          </div>
        </div>
      </section>

      {/* ── The Name ── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-t-text mb-6">Why &ldquo;Biased Bipartisan&rdquo;?</h2>
          <p className="text-sm sm:text-base text-t-text-2 leading-relaxed mb-4">
            Those two words shouldn&apos;t go together. And that&apos;s exactly why they work.
          </p>
          <p className="text-sm sm:text-base text-t-text-2 leading-relaxed">
            Because we&apos;re being honest about something that every other platform pretends doesn&apos;t exist — that everyone comes to ideas with a bias. The question isn&apos;t whether you&apos;re biased. The question is whether you&apos;re aware of it. That&apos;s the brand truth: <span className="font-semibold text-t-text">intellectual honesty over false neutrality.</span>
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-lg flex flex-col sm:flex-row gap-4">
          <Link href="/debates" className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-t-edge-strong bg-t-surface py-4 text-sm font-semibold text-t-text hover:bg-t-hover transition shadow-t">
            <Swords className="size-4" /> Explore Debates <ArrowRight className="size-4 text-t-text-3" />
          </Link>
          <Link href="/" className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-t-accent py-4 text-sm font-semibold text-white hover:opacity-90 transition">
            <Phone className="size-4" /> Make a Call <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
