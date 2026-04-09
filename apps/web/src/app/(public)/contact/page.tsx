import type { Metadata } from 'next'
import { ContactForm } from './contact-form'

export const metadata: Metadata = {
  title: 'Contact Us — Bipi News',
  description: 'Get in touch with the Bipi News team. Sponsorships, journalist applications, partnerships, press, support, or feedback.',
  alternates: { canonical: '/contact' },
}

const REASONS = [
  {
    label: 'Sponsorship & Advertising',
    description: 'Place your brand on our platform. In-article cards, wire feed, commentary, or tournament sponsorships.',
  },
  {
    label: 'Investigative Journalist Application',
    description: 'Apply to join as a verified investigative journalist. Compile evidence, call The Reporter, publish to The Wire.',
  },
  {
    label: 'Partnership & Integration',
    description: 'Build with us. API access, data licensing, educational partnerships, or technology integrations.',
  },
  {
    label: 'Press & Media Inquiry',
    description: 'Writing about AI in journalism? Covering the intersection of technology and discourse? We talk to reporters.',
  },
  {
    label: 'Bug Report or Technical Issue',
    description: 'Something broke. Tell us what happened, what you expected, and what you saw instead.',
  },
  {
    label: 'Feature Request or Feedback',
    description: 'You use the platform and want something different. We read every message.',
  },
  {
    label: 'Account or Billing Support',
    description: 'Credit issues, subscription questions, or account access problems.',
  },
  {
    label: 'Something Else',
    description: 'None of the above. Tell us what you need.',
  },
]

export default function ContactPage() {
  return (
    <div className="bg-t-bg">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 50% 30%, #C8A44A 0%, transparent 40%)',
        }} />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.3em] mb-6" style={{ color: '#C8A44A' }}>
            Contact Us
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-t-text mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Let&apos;s talk.
          </h1>
          <p className="text-base text-t-text-2 leading-relaxed max-w-md mx-auto">
            Sponsorships, partnerships, journalist applications, press, support, or something we haven&apos;t thought of yet.
          </p>
        </div>
      </section>

      {/* ── Reasons + Form ── */}
      <section className="px-4 pb-20 sm:pb-28">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 lg:grid-cols-5">

            {/* Reasons sidebar */}
            <div className="lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-t-text-3 mb-4">How can we help?</p>
              <div className="space-y-3">
                {REASONS.map((r) => (
                  <div key={r.label} className="rounded-xl border border-t-edge bg-t-surface p-4">
                    <p className="text-sm font-semibold text-t-text mb-1">{r.label}</p>
                    <p className="text-xs text-t-text-3 leading-relaxed">{r.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-t-edge bg-t-surface p-6 sm:p-8 shadow-t sticky top-20">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-t-text-3 mb-6">Send a Message</p>
                <ContactForm reasons={REASONS.map((r) => r.label)} />
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
