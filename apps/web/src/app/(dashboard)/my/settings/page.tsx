'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const TOPIC_OPTIONS = [
  'Environmental Science', 'History & Politics', 'Law & Jurisprudence',
  'Medicine & Healthcare', 'Philosophy & Ethics', 'Rhetoric & Persuasion',
  'Statistics & Data Science', 'Technology & Innovation',
]

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? [])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const supabase = getSupabaseBrowserClient()

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase
      .from('user_profiles')
      .update({ display_name: displayName.trim(), interests })
      .eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleInterest(topic: string) {
    setInterests(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-t-text mb-6">Settings</h1>

      {/* Profile */}
      <div className="rounded-2xl border border-t-edge bg-t-surface p-5 shadow-t mb-6">
        <h2 className="text-sm font-semibold text-t-text mb-4">Profile</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-t-text-2 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-t-surface-el border border-t-edge-strong px-4 py-3 text-sm text-t-text placeholder:text-t-text-4 focus:outline-none focus:border-t-accent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-t-text-2 mb-1.5">Email</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full rounded-xl bg-t-surface-inset border border-t-edge px-4 py-3 text-sm text-t-text-3"
            />
          </div>
        </div>
      </div>

      {/* Interests */}
      <div className="rounded-2xl border border-t-edge bg-t-surface p-5 shadow-t mb-6">
        <h2 className="text-sm font-semibold text-t-text mb-1">Interests</h2>
        <p className="text-xs text-t-text-3 mb-4">Select topics to personalize your experience.</p>
        <div className="flex flex-wrap gap-2">
          {TOPIC_OPTIONS.map((topic) => (
            <button
              key={topic}
              onClick={() => toggleInterest(topic)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                interests.includes(topic)
                  ? 'border-t-accent bg-t-accent-soft text-t-accent-text'
                  : 'border-t-edge text-t-text-3 hover:border-t-edge-strong hover:text-t-text-2',
              )}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'w-full rounded-xl py-3 text-sm font-semibold transition mb-6',
          saving ? 'bg-t-surface-el text-t-text-4' : 'bg-t-accent text-white hover:opacity-90 active:scale-[0.98]',
        )}
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
      </button>

      {/* Danger zone */}
      <div className="rounded-2xl border border-t-edge bg-t-surface p-5 shadow-t">
        <h2 className="text-sm font-semibold text-t-text mb-4">Account</h2>
        <button
          onClick={signOut}
          className="rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/40 transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
