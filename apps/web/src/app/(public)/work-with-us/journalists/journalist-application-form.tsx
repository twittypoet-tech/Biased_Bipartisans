'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

interface Props {
  expertiseOptions: string[]
}

export function JournalistApplicationForm({ expertiseOptions }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [expertise, setExpertise] = useState<string[]>([])
  const [statement, setStatement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleExpertise(value: string) {
    setExpertise((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/journalist-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          portfolioUrl: portfolioUrl.trim() || undefined,
          expertise,
          statement: statement.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-800/40 bg-green-950/20 p-8 text-center">
        <CheckCircle className="size-10 text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-t-text mb-2">Application Submitted</h3>
        <p className="text-sm text-t-text-2">
          Thank you for applying. Our team will review your application and get back to you at {email}.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-t-text mb-1.5">
          Full Name <span className="text-red-400">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-xl border border-t-edge bg-t-surface px-4 py-3 text-sm text-t-text placeholder:text-t-text-4 focus:border-[#C8A44A] focus:outline-none transition"
          placeholder="Your full name"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-t-text mb-1.5">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-t-edge bg-t-surface px-4 py-3 text-sm text-t-text placeholder:text-t-text-4 focus:border-[#C8A44A] focus:outline-none transition"
          placeholder="you@example.com"
        />
      </div>

      {/* Portfolio URL */}
      <div>
        <label htmlFor="portfolioUrl" className="block text-sm font-medium text-t-text mb-1.5">
          Portfolio URL
        </label>
        <input
          id="portfolioUrl"
          type="url"
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
          className="w-full rounded-xl border border-t-edge bg-t-surface px-4 py-3 text-sm text-t-text placeholder:text-t-text-4 focus:border-[#C8A44A] focus:outline-none transition"
          placeholder="https://yourportfolio.com"
        />
      </div>

      {/* Areas of Expertise */}
      <div>
        <p className="text-sm font-medium text-t-text mb-2">Areas of Expertise</p>
        <div className="flex flex-wrap gap-2">
          {expertiseOptions.map((option) => {
            const selected = expertise.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleExpertise(option)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? 'border-[#C8A44A] bg-[#C8A44A]/10 text-[#C8A44A]'
                    : 'border-t-edge bg-t-surface text-t-text-2 hover:border-t-edge-strong'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {/* Statement */}
      <div>
        <label htmlFor="statement" className="block text-sm font-medium text-t-text mb-1.5">
          Why do you want to work with BIPI?
        </label>
        <textarea
          id="statement"
          rows={4}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          className="w-full rounded-xl border border-t-edge bg-t-surface px-4 py-3 text-sm text-t-text placeholder:text-t-text-4 focus:border-[#C8A44A] focus:outline-none transition resize-none"
          placeholder="Tell us about your investigative experience and what stories you want to pursue..."
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: '#C8A44A' }}
      >
        {submitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  )
}
