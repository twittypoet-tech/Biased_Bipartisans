'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Phone, Sparkles, RefreshCw } from 'lucide-react'

type CallStep = 'idle' | 'connecting' | 'live' | 'done' | 'error'

export default function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Onboarding call state
  const [callStep, setCallStep] = useState<CallStep>('idle')
  const [callError, setCallError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const retellClientRef = useRef<any>(null)

  const supabase = getSupabaseBrowserClient()

  useEffect(() => { if (profile?.display_name) setDisplayName(profile.display_name) }, [profile?.display_name])

  // ── Profile save ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase
      .from('user_profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', user.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ── Onboarding call logic (Retell Web SDK — two-way voice) ───────────────

  async function startOnboardingCall() {
    setCallStep('connecting')
    setCallError('')

    try {
      // Get access token from our API
      const res = await fetch('/api/onboarding/call', { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Failed to connect')
      }
      const { accessToken } = await res.json()

      // Use Retell Web SDK for two-way voice (microphone + speaker)
      const { RetellWebClient } = await import('retell-client-js-sdk')
      const retellClient = new RetellWebClient()
      retellClientRef.current = retellClient

      retellClient.on('call_started', () => {
        setCallStep('live')
      })

      retellClient.on('call_ended', () => {
        retellClientRef.current = null
        setCallStep('done')
        // Refresh profile after call — webhook will have updated interests
        setTimeout(() => refreshProfile(), 3000)
      })

      retellClient.on('error', (error: Error) => {
        console.error('Retell onboarding error:', error)
        retellClientRef.current = null
        setCallError(error.message || 'Call error')
        setCallStep('error')
      })

      await retellClient.startCall({ accessToken })
    } catch (err) {
      setCallError(err instanceof Error ? err.message : 'Something went wrong')
      setCallStep('error')
    }
  }

  function handleLeaveCall() {
    retellClientRef.current?.stopCall()
    retellClientRef.current = null
    setCallStep('done')
    setTimeout(() => refreshProfile(), 3000)
  }

  const hasInterests = (profile?.interests ?? []).length > 0

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-t-text mb-6">Settings</h1>

      {/* ── Profile ── */}
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
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'w-full rounded-xl py-3 text-sm font-semibold transition',
              saving ? 'bg-t-surface-el text-t-text-4' : 'bg-t-accent text-white hover:opacity-90 active:scale-[0.98]',
            )}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* ── Interests — Bipi Onboarding ── */}
      <div className="rounded-2xl border border-t-edge bg-t-surface p-5 shadow-t mb-6">
        <h2 className="text-sm font-semibold text-t-text mb-1">Your Interests</h2>
        <p className="text-xs text-t-text-3 mb-4">
          Talk to Bipi to personalize your news feed. Bipi will ask about your interests and update your profile automatically.
        </p>

        {/* Current interests */}
        {hasInterests && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(profile?.interests ?? []).map((interest) => (
              <span key={interest} className="rounded-full border border-t-accent/30 bg-t-accent-soft px-2.5 py-1 text-xs font-medium text-t-accent-text">
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* Call states */}
        {callStep === 'idle' && (
          <button
            onClick={startOnboardingCall}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-t-accent py-3.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition"
          >
            {hasInterests ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
            {hasInterests ? 'Update Interests with Bipi' : 'Personalize with Bipi'}
          </button>
        )}

        {callStep === 'connecting' && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="size-12 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center">
              <svg className="animate-spin text-t-text-3" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            </div>
            <p className="text-sm font-medium text-t-text">Connecting to Bipi...</p>
          </div>
        )}

        {callStep === 'live' && (
          <div className="flex flex-col items-center py-4 gap-4">
            <div className="size-12 rounded-full bg-t-accent-soft border border-t-accent/30 flex items-center justify-center">
              <Phone className="size-5 text-t-accent-text" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-t-text">Bipi is listening</p>
              <p className="text-xs text-t-text-3 mt-0.5">Tell Bipi about your interests</p>
            </div>
            {/* Waveform */}
            <div className="flex items-end gap-1 h-8">
              {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.65].map((h, i) => (
                <div key={i} className="w-1.5 rounded-full bg-t-accent animate-pulse" style={{ height: `${h * 100}%`, animationDelay: `${i * 70}ms`, animationDuration: '900ms' }} />
              ))}
            </div>
            <button
              onClick={handleLeaveCall}
              className="flex items-center gap-2 rounded-xl border border-t-edge-strong bg-t-surface-el px-5 py-2.5 text-sm font-medium text-t-text-2 hover:bg-t-hover transition"
            >
              End Call
            </button>
          </div>
        )}

        {callStep === 'done' && (
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="size-12 rounded-full bg-green-950/40 border border-green-800/60 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-sm font-semibold text-t-text">Interests updated!</p>
            <p className="text-xs text-t-text-3">Your profile will refresh shortly.</p>
            <button onClick={() => setCallStep('idle')} className="text-xs text-t-accent-text hover:underline mt-1">Done</button>
          </div>
        )}

        {callStep === 'error' && (
          <div className="flex flex-col items-center py-4 gap-3">
            <p className="text-sm text-red-400">{callError}</p>
            <button onClick={() => setCallStep('idle')} className="text-xs text-t-accent-text hover:underline">Try again</button>
          </div>
        )}
      </div>

      {/* ── Account ── */}
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
