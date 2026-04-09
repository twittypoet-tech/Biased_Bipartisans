'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, X, Search, Shield, FileText, Clock } from 'lucide-react'

export function CallReporterPopup() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: '#C8A44A' }}
      >
        <Phone className="size-4" />
        Call The Reporter
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg rounded-2xl border border-t-edge bg-t-bg shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-t-edge">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(200,164,74,0.15)', border: '1px solid rgba(200,164,74,0.25)' }}>
                  <Phone className="size-4" style={{ color: '#C8A44A' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-t-text">The Reporter</p>
                  <p className="text-[11px] text-t-text-3">Your investigative AI</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="size-8 rounded-lg flex items-center justify-center text-t-text-3 hover:bg-t-hover transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6">

              <h3 className="text-xl font-bold text-t-text mb-4" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                You have a question. It has sources.
              </h3>

              <div className="space-y-4 text-sm text-t-text-2 leading-relaxed">
                <p>
                  The Reporter is a voice-based investigative AI that searches the live web while you talk. Ask it anything — a policy question, a rumor you want verified, a topic you need to understand before a meeting tomorrow. It pulls primary sources, cross-references claims, and delivers a structured report with every citation linked.
                </p>
                <p>
                  No hallucinated facts. No unsourced claims. The Reporter runs on an evidence-first methodology: if it can&apos;t find a source, it says so. If the evidence is mixed, it shows you both sides. If a claim is speculative, it labels it speculative. You get the research — you draw the conclusions.
                </p>
              </div>

              {/* Feature grid */}
              <div className="grid grid-cols-2 gap-2.5 mt-6">
                {[
                  { icon: Search, text: 'Searches the live web in real time' },
                  { icon: Shield, text: 'Anti-hallucination guardrails built in' },
                  { icon: FileText, text: 'Every claim linked to its source' },
                  { icon: Clock, text: 'Full report delivered in minutes' },
                ].map((f) => (
                  <div key={f.text} className="flex items-start gap-2.5 rounded-xl border border-t-edge bg-t-surface p-3">
                    <f.icon className="size-4 shrink-0 mt-0.5 text-t-text-3" />
                    <p className="text-xs text-t-text-2 leading-snug">{f.text}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-t-text-3 mt-5 leading-relaxed">
                Built for researchers, analysts, journalists, students, and anyone who needs to know something and needs to know the evidence behind it. Not a chatbot. Not a search engine. A reporter that works for you.
              </p>
            </div>

            {/* Footer CTA */}
            <div className="px-6 py-5 border-t border-t-edge bg-t-surface">
              <p className="text-xs font-semibold text-t-text text-center mb-3">
                Get 10 free credits when you sign up — enough for 2 full reports.
              </p>
              <Link
                href="/auth"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: '#C8A44A' }}
              >
                Sign Up Free
              </Link>
              <p className="text-[11px] text-t-text-4 text-center mt-2.5">
                No credit card required. Reports ready in minutes.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
