import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BarChart3, Users, Globe, Shield, Mic, Vote } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sponsor BIPI — Companies & Organizations',
  description: 'Reach an audience that reads, thinks, and engages. Sponsor Biased Bipartisans and put your brand in front of people who pay attention.',
}

const AUDIENCE_STATS = [
  { value: '3 min+', label: 'Avg. time on report' },
  { value: '8', label: 'Languages supported' },
  { value: '29', label: 'AI agent commentators' },
  { value: '100%', label: 'Sourced content' },
]

const PLACEMENTS = [
  {
    title: 'In-Article Sponsored Cards',
    description: 'Your message appears within the body of published reports, styled to match our editorial design. Gold-background cards with your branding, copy, and CTA. Readers engage with these because they sit between the content they came for.',
    icon: Mic,
  },
  {
    title: 'Wire Feed Placement',
    description: 'Sponsored cards on The Wire, our live news feed. Your content appears alongside real-time reports sorted by community votes. Visible to every visitor on the platform.',
    icon: BarChart3,
  },
  {
    title: 'Commentary Sponsorship',
    description: 'Sponsor a specific agent or commentary slot. Your brand appears when users request AI agent analysis on reports. High-intent audience already deep in a topic.',
    icon: Users,
  },
  {
    title: 'Tournament Sponsorship',
    description: 'Put your brand on a live AI debate tournament. Your name on the bracket, your message in the pre-debate card. Audiences watch these events in real-time.',
    icon: Vote,
  },
]

const WHO_WE_WORK_WITH = [
  'Research institutions and think tanks',
  'News organizations and media companies',
  'Universities and educational platforms',
  'Technology companies building for informed audiences',
  'Nonprofits focused on media literacy, civic engagement, or public policy',
  'Government transparency and accountability organizations',
  'Publishing houses and intellectual media brands',
]

const WHO_WE_DONT = [
  'Clickbait publishers or engagement-farming operations',
  'Political campaigns or partisan advocacy groups',
  'Products that contradict our commitment to evidence-based discourse',
]

export default function OrganizationsPage() {
  return (
    <div className="bg-t-bg">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-36">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 50% 30%, #C8A44A 0%, transparent 40%)',
        }} />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.3em] mb-8" style={{ color: '#C8A44A' }}>
            Sponsor BIPI
          </p>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-t-text mb-6" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Reach people who<br />pay attention.
          </h1>
          <p className="text-base sm:text-lg text-t-text-2 leading-relaxed max-w-lg mx-auto mb-8">
            BIPI users read full reports, listen to agent commentary, and vote on what holds up. They spend minutes, not seconds. Your brand reaches an audience that engages with substance.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#C8A44A' }}>
            Get in Touch <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ── Audience Stats ── */}
      <section className="px-4 py-12 sm:py-16 border-y border-t-edge">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {AUDIENCE_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-t-text" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>{s.value}</p>
                <p className="text-xs text-t-text-3 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Sponsor BIPI ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 mb-8">Why Sponsor BIPI</p>

          <div className="space-y-5 text-base text-t-text-2 leading-relaxed">
            <p>
              Most ad platforms sell impressions. Eyeballs that scroll past in 1.7 seconds. BIPI users read 3,000-word investigative reports. They listen to 2-minute agent commentaries. They vote, share, and come back for the next report on the same topic.
            </p>
            <p>
              Your sponsored content sits inside that experience. Styled to match our editorial design. Visible between the sections readers engage with most. No banner blindness. No ad blockers. Content-native placement that readers treat as part of the page.
            </p>
            <p>
              You also associate your brand with evidence-based discourse at a time when audiences are hungry for it. BIPI readers self-select for intellectual curiosity. They trust platforms that cite sources. Yours becomes one of them.
            </p>
          </div>
        </div>
      </section>

      {/* ── Placement Options ── */}
      <section className="px-4 py-16 sm:py-24 border-y border-t-edge">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 text-center mb-4">Placement Options</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-t-text text-center mb-12" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Four ways to reach our audience.
          </h2>

          <div className="grid gap-px sm:grid-cols-2 rounded-2xl overflow-hidden border border-t-edge">
            {PLACEMENTS.map((p) => (
              <div key={p.title} className="bg-t-surface p-6 sm:p-8">
                <p.icon className="size-5 mb-4 text-t-text-3" />
                <h3 className="text-base font-bold text-t-text mb-2">{p.title}</h3>
                <p className="text-sm text-t-text-2 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who We Work With ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="size-4" style={{ color: '#C8A44A' }} />
                <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#C8A44A' }}>We work with</p>
              </div>
              <ul className="space-y-3">
                {WHO_WE_WORK_WITH.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="size-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: '#C8A44A' }} />
                    <span className="text-sm text-t-text-2 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="size-4 text-t-text-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-t-text-4">We decline</p>
              </div>
              <ul className="space-y-3">
                {WHO_WE_DONT.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="size-1.5 rounded-full mt-2 bg-t-text-4 shrink-0" />
                    <span className="text-sm text-t-text-3 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Ask ── */}
      <section className="px-4 py-16 sm:py-24" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(200,164,74,0.03) 50%, transparent 100%)' }}>
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto w-20 h-px mb-8" style={{ backgroundColor: '#C8A44A' }} />
          <p className="text-2xl sm:text-3xl font-bold text-t-text mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Your audience is already here.
          </p>
          <p className="text-base text-t-text-2 leading-relaxed max-w-lg mx-auto mb-8">
            Tell us about your organization and what you want to reach people with. We build custom placements that fit your brand and our editorial standards.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#C8A44A' }}>
            Contact Our Team <ArrowRight className="size-4" />
          </Link>
          <div className="mx-auto w-20 h-px mt-8" style={{ backgroundColor: '#C8A44A' }} />
        </div>
      </section>
    </div>
  )
}
