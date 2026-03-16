'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const FORMATS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Classic Duel', description: '2 agents · structured rounds', style: 'structured' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Panel Clash', description: '4 agents · structured rounds', style: 'structured' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Freeflow Duel', description: '2 agents · Retell AI voice · live audio', style: 'freeflow' },
]

// Timezones to preview
const PREVIEW_ZONES = [
  { label: 'ET', iana: 'America/New_York' },
  { label: 'CT', iana: 'America/Chicago' },
  { label: 'MT', iana: 'America/Denver' },
  { label: 'PT', iana: 'America/Los_Angeles' },
  { label: 'GMT', iana: 'Europe/London' },
  { label: 'CET', iana: 'Europe/Paris' },
]

function formatInZone(date: Date, iana: string): string {
  return date.toLocaleString('en-US', {
    timeZone: iana,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

export default function CreateDebatePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [userTz, setUserTz] = useState('')
  const [scheduledLocal, setScheduledLocal] = useState('')
  const [parsedDate, setParsedDate] = useState<Date | null>(null)
  const [selectedFormat, setSelectedFormat] = useState(FORMATS[0]!.id)

  useEffect(() => {
    setUserTz(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  // Parse the datetime-local value as local time → Date
  useEffect(() => {
    if (!scheduledLocal) {
      setParsedDate(null)
      return
    }
    // datetime-local gives "YYYY-MM-DDTHH:mm" without tz — browser interprets as local
    const d = new Date(scheduledLocal)
    setParsedDate(isNaN(d.getTime()) ? null : d)
  }, [scheduledLocal])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)

    const form = new FormData(e.currentTarget)

    // Convert local datetime to UTC ISO string
    const rawScheduled = scheduledLocal
    const scheduledAt = rawScheduled && parsedDate ? parsedDate.toISOString() : null

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
        formatId: selectedFormat,
        scheduledAt,
      }),
    })

    if (res.ok) {
      const { slug } = await res.json()
      router.push(`/admin/debates/${slug}`)
    } else {
      const data = await res.json().catch(() => ({}))
      setSubmitting(false)
      alert(`Failed to create debate:\n\n${data.error ?? data.message ?? JSON.stringify(data)}`)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none placeholder:text-neutral-600'

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
            className={inputCls}
          />
        </div>

        {/* Topic Framing */}
        <fieldset className="space-y-4 rounded-xl border border-neutral-800 p-5">
          <legend className="px-2 text-sm font-semibold text-neutral-400">Topic Framing</legend>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Headline <span className="text-neutral-700">(the sharp version of the question)</span>
            </label>
            <input
              name="headline"
              required
              placeholder="e.g., Should cities override local homeowners to force more housing?"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Conflict Description</label>
            <textarea
              name="conflict_description"
              required
              rows={2}
              placeholder="What makes this a genuine conflict? What are the opposing forces?"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Forced Tradeoff</label>
            <textarea
              name="forced_tradeoff"
              required
              rows={2}
              placeholder="What must be sacrificed regardless of which side wins?"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Decision Surface</label>
            <input
              name="decision_surface"
              required
              placeholder="What specific decision is at stake?"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'moral_tension', label: 'Moral Tension', placeholder: 'Rights vs. security…' },
              { name: 'strategic_tension', label: 'Strategic Tension', placeholder: 'Short-term vs. long-term…' },
              { name: 'identity_tension', label: 'Identity Tension', placeholder: 'Who we are vs. who we…' },
            ].map((f) => (
              <div key={f.name}>
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  {f.label}{' '}
                  <span className="text-neutral-700">(optional)</span>
                </label>
                <input name={f.name} placeholder={f.placeholder} className={inputCls} />
              </div>
            ))}
          </div>
        </fieldset>

        {/* Format Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium">Format</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setSelectedFormat(fmt.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  selectedFormat === fmt.id
                    ? 'border-white/30 bg-neutral-800 text-white'
                    : 'border-neutral-800 bg-neutral-900/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                <div className="text-sm font-semibold">{fmt.name}</div>
                <div className="mt-0.5 text-[11px] text-neutral-500">{fmt.description}</div>
                {fmt.style === 'freeflow' && (
                  <span className="mt-1.5 inline-block rounded-full bg-green-900/50 px-2 py-0.5 text-[10px] font-medium text-green-400">
                    Live voice
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div>
          <label className="mb-2 block text-sm font-medium">Schedule</label>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
            {/* Timezone badge */}
            {userTz && (
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <ClockIcon />
                Your timezone: <span className="font-medium text-neutral-300">{userTz}</span>
              </div>
            )}

            {/* Datetime input */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-500">
                Date & Time <span className="text-neutral-700">(in your local time, optional)</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-neutral-500 focus:outline-none [color-scheme:dark]"
              />
            </div>

            {/* Timezone preview */}
            {parsedDate && (
              <div className="space-y-1 pt-1 border-t border-neutral-800">
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-600 mb-2">
                  That&apos;s…
                </p>
                <div className="grid gap-1">
                  {PREVIEW_ZONES.map(({ label, iana }) => {
                    const isUserZone = userTz === iana
                    return (
                      <div
                        key={iana}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                          isUserZone ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500'
                        }`}
                      >
                        <span className="font-medium w-8">{label}</span>
                        <span>{formatInZone(parsedDate, iana)}</span>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-neutral-700 pt-1">
                  UTC: {parsedDate.toISOString()}
                </p>
              </div>
            )}

            {!scheduledLocal && (
              <p className="text-xs text-neutral-600">
                Leave blank to save as a draft. You can start it manually from the admin panel.
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Debate'}
        </button>
      </form>
    </div>
  )
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
