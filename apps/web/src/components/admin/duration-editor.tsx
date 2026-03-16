'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DurationEditorProps {
  debateId: string
  currentMinutes: number | null  // null = using format default (30 min)
  formatDefault: number           // from format.max_duration_minutes
  canEdit: boolean
}

export function DurationEditor({ debateId, currentMinutes, formatDefault, canEdit }: DurationEditorProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentMinutes ?? formatDefault)
  const [saving, setSaving] = useState(false)

  const displayed = currentMinutes ?? formatDefault

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/admin/debates/${debateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationOverrideMinutes: value }),
    })
    setSaving(false)
    if (res.ok) {
      setEditing(false)
      router.refresh()
    }
  }

  if (!editing) {
    return (
      <span className="flex items-center gap-1.5">
        Duration: {displayed} min
        {currentMinutes === null && (
          <span className="text-neutral-600">(format default)</span>
        )}
        {canEdit && (
          <button
            onClick={() => { setValue(displayed); setEditing(true) }}
            className="ml-1 text-neutral-600 hover:text-neutral-300 transition"
            title="Edit duration"
          >
            <PencilIcon />
          </button>
        )}
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5">
      <input
        type="number"
        min={5}
        max={180}
        step={5}
        value={value}
        onChange={(e) => setValue(Math.max(5, Math.min(180, Number(e.target.value))))}
        className="w-20 rounded border border-neutral-600 bg-neutral-900 px-2 py-0.5 text-xs focus:border-neutral-400 focus:outline-none"
        autoFocus
      />
      <span className="text-neutral-500 text-xs">min</span>
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium hover:bg-white/20 disabled:opacity-50 transition"
      >
        {saving ? '…' : 'Save'}
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-neutral-600 hover:text-neutral-300 text-xs transition"
      >
        Cancel
      </button>
    </span>
  )
}

function PencilIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
