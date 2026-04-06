import type { Metadata } from 'next'
import { JournalistApplicationForm } from './journalist-application-form'

export const metadata: Metadata = {
  title: 'Investigative Journalists — Work With Us',
  description: 'Join Biased Bipartisans as an Investigative Journalist. Compile evidence, feed it to AI, and distribute fact-based reports to the world.',
}

const EXPERTISE_OPTIONS = [
  'Environmental Science',
  'History & Politics',
  'Law & Jurisprudence',
  'Medicine & Healthcare',
  'Philosophy & Ethics',
  'Rhetoric & Persuasion',
  'Statistics & Data Science',
  'Technology & Innovation',
]

const STEPS = [
  { number: '01', title: 'Apply & Get Verified', description: 'Submit your application with your portfolio and areas of expertise. Our team reviews and verifies your credentials.' },
  { number: '02', title: 'Compile Your Evidence', description: 'Investigate your story. Gather sourced, verified evidence — documents, data, expert quotes, public records.' },
  { number: '03', title: 'Call The Reporter', description: 'Present your findings to The Reporter AI. It structures your evidence into a polished, editorial-quality report.' },
  { number: '04', title: 'Publish to The Wire', description: 'Your report publishes directly to The Wire with journalist attribution. No approval queue — your verified status earns direct access.' },
]

const BENEFITS = [
  { title: 'Direct Wire Publishing', description: 'Your reports go straight to The Wire — no admin approval needed. Your verification status is your credential.' },
  { title: 'Journalist Attribution', description: 'Every report you generate is attributed to you. Build your reputation on the platform through quality reporting.' },
  { title: 'Higher Monthly Credits', description: 'Verified journalists receive an enhanced credit allocation to support their investigative work.' },
  { title: 'Reader Engagement', description: 'Build your reputation through upvotes, commentary requests, and reader engagement on your published reports.' },
]

export default function JournalistsPage() {
  return (
    <div className="bg-t-bg">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-28 sm:py-40">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 50% 30%, #C8A44A 0%, transparent 40%)',
        }} />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.3em] mb-8" style={{ color: '#C8A44A' }}>
            Work With Us
          </p>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-t-text mb-8" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Investigative<br />Journalists
          </h1>
          <div className="w-12 h-px mx-auto mb-8" style={{ backgroundColor: '#C8A44A' }} />
          <p className="text-base sm:text-lg text-t-text-2 leading-relaxed max-w-lg mx-auto">
            You bring the evidence. AI brings the structure. Together, we distribute fact-based reporting to the world.
          </p>
        </div>
      </section>

      {/* ── The Model ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 mb-8">The Evidence Pipeline</p>

          <div className="space-y-8 text-base sm:text-lg text-t-text-2 leading-relaxed">
            <p>
              Biased Bipartisans is building a new model for investigative journalism — one where human expertise and AI capability work in symbiosis.
            </p>
            <p className="text-xl sm:text-2xl text-t-text font-medium" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Journalists compile the evidence. AI structures and distributes it. BIPI amplifies it.
            </p>
            <p>
              Your sourced, verified evidence trains our models to produce reports grounded in fact. You bring the investigative legwork — documents, data, expert quotes, public records. The Reporter AI transforms your findings into polished, editorial-quality content. And the BIPI platform puts it in front of an audience that cares.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 text-center mb-12">How It Works</p>

          <div className="grid gap-6 sm:grid-cols-2">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl p-8"
                style={{ backgroundColor: 'rgba(200,164,74,0.05)', border: '1px solid rgba(200,164,74,0.15)' }}
              >
                <p className="text-3xl font-bold mb-3" style={{ color: '#C8A44A', fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {step.number}
                </p>
                <h3 className="text-base font-bold text-t-text mb-2">{step.title}</h3>
                <p className="text-sm text-t-text-2 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Get ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 text-center mb-12">What You Get</p>

          <div className="grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-t-edge bg-t-surface p-6 shadow-t">
                <h3 className="text-sm font-bold text-t-text mb-2">{b.title}</h3>
                <p className="text-sm text-t-text-2 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl">
          <div className="border-l-2 pl-6 sm:pl-8" style={{ borderColor: '#C8A44A' }}>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-t-text-3 mb-6">Requirements</p>
            <ul className="space-y-4 text-base text-t-text-2 leading-relaxed">
              <li>Demonstrated journalism experience — published work, portfolio, or verifiable credentials</li>
              <li>Commitment to sourced, verified reporting — every claim backed by evidence</li>
              <li>Agreement to BIPI editorial standards — accuracy over speed, nuance over sensationalism</li>
              <li>Willingness to work with AI as a collaborative tool, not a replacement for investigative rigor</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Application Form ── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-xl">
          <div className="text-center mb-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] mb-4" style={{ color: '#C8A44A' }}>Apply to Join</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-t-text" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Start Your Application
            </h2>
          </div>

          <JournalistApplicationForm expertiseOptions={EXPERTISE_OPTIONS} />
        </div>
      </section>
    </div>
  )
}
