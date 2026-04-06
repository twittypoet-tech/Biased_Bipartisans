'use client'

import { useState } from 'react'
import { CheckCircle, Send } from 'lucide-react'

interface Props {
  reasons: string[]
}

export function ContactForm({ reasons }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !reason || !message.trim()) return
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          reason,
          message: message.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to send')
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
      <div className="py-12 text-center">
        <CheckCircle className="size-10 mx-auto mb-4" style={{ color: '#C8A44A' }} />
        <p className="text-lg font-bold text-t-text mb-2" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          Message sent.
        </p>
        <p className="text-sm text-t-text-3">
          We read every message. You will hear back at {email}.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-t-text mb-1.5">
          Name <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-t-edge bg-t-surface-el px-4 py-3 text-sm text-t-text placeholder:text-t-text-4 focus:border-[#C8A44A] focus:outline-none transition"
          placeholder="Your name"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-t-text mb-1.5">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-t-edge bg-t-surface-el px-4 py-3 text-sm text-t-text placeholder:text-t-text-4 focus:border-[#C8A44A] focus:outline-none transition"
          placeholder="you@example.com"
        />
      </div>

      {/* Reason */}
      <div>
        <label htmlFor="contact-reason" className="block text-sm font-medium text-t-text mb-1.5">
          Reason <span className="text-red-400">*</span>
        </label>
        <select
          id="contact-reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-t-edge bg-t-surface-el px-4 py-3 text-sm text-t-text focus:border-[#C8A44A] focus:outline-none transition appearance-none"
        >
          <option value="">Select a reason...</option>
          {reasons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-t-text mb-1.5">
          Message <span className="text-red-400">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-t-edge bg-t-surface-el px-4 py-3 text-sm text-t-text placeholder:text-t-text-4 focus:border-[#C8A44A] focus:outline-none transition resize-none"
          placeholder="Tell us what you need..."
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !name.trim() || !email.trim() || !reason || !message.trim()}
        className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ backgroundColor: '#C8A44A' }}
      >
        <Send className="size-4" />
        {submitting ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
