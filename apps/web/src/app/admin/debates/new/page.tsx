'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateDebatePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/admin/debates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        topicFraming: {
          headline: form.get('headline'),
          conflict_description: form.get('conflict_description'),
          forced_tradeoff: form.get('forced_tradeoff'),
          moral_tension: form.get('moral_tension') || null,
          strategic_tension: form.get('strategic_tension') || null,
          identity_tension: form.get('identity_tension') || null,
          decision_surface: form.get('decision_surface'),
        },
        formatId: form.get('format_id'),
        scheduledAt: form.get('scheduled_at') || null,
      }),
    })

    if (res.ok) {
      const { slug } = await res.json()
      router.push(`/admin/debates/${slug}`)
    } else {
      setSubmitting(false)
      alert('Failed to create debate')
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Debate</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Frame a topic as a real conflict with forced tradeoffs
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium">Debate Title</label>
          <input
            name="title"
            required
            placeholder="e.g., The Case For and Against Military Intervention"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        {/* Topic Framing */}
        <fieldset className="space-y-4 rounded-lg border border-neutral-800 p-4">
          <legend className="px-2 text-sm font-semibold text-neutral-400">
            Topic Framing
          </legend>

          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              Headline (the sharp version of the question)
            </label>
            <input
              name="headline"
              required
              placeholder="e.g., Should cities override local homeowners to force more housing?"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              Conflict Description
            </label>
            <textarea
              name="conflict_description"
              required
              rows={2}
              placeholder="What makes this a genuine conflict? What are the opposing forces?"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              Forced Tradeoff
            </label>
            <textarea
              name="forced_tradeoff"
              required
              rows={2}
              placeholder="What must be sacrificed regardless of which side wins?"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              Decision Surface
            </label>
            <input
              name="decision_surface"
              required
              placeholder="What specific decision is at stake?"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Moral Tension (optional)
              </label>
              <input
                name="moral_tension"
                placeholder="Rights vs. security..."
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Strategic Tension (optional)
              </label>
              <input
                name="strategic_tension"
                placeholder="Short-term vs. long-term..."
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">
                Identity Tension (optional)
              </label>
              <input
                name="identity_tension"
                placeholder="Who we are vs. who we..."
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
          </div>
        </fieldset>

        {/* Format Selection */}
        <div>
          <label className="mb-1 block text-sm font-medium">Format</label>
          <select
            name="format_id"
            required
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="00000000-0000-0000-0000-000000000001">Classic Duel (2 agents)</option>
            <option value="00000000-0000-0000-0000-000000000002">Panel Clash (4 agents)</option>
          </select>
        </div>

        {/* Schedule */}
        <div>
          <label className="mb-1 block text-sm font-medium">
            Schedule (optional)
          </label>
          <input
            name="scheduled_at"
            type="datetime-local"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Debate'}
        </button>
      </form>
    </div>
  )
}
