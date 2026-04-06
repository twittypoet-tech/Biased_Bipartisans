'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Phone, Globe, Clock, ChevronRight, Sparkles, RefreshCw, Settings } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ReporterCall } from '@bipi/shared'

interface UserPreset {
  id: string
  title: string
  query_template: string
  interest: string | null
  sort_order: number
}

const INTEREST_COLORS = [
  'bg-rose-950/80 text-rose-300',
  'bg-sky-950/80 text-sky-300',
  'bg-violet-950/80 text-violet-300',
  'bg-teal-950/80 text-teal-300',
  'bg-orange-950/80 text-orange-300',
  'bg-emerald-950/80 text-emerald-300',
  'bg-fuchsia-950/80 text-fuchsia-300',
  'bg-lime-950/80 text-lime-300',
]

function interestColor(interest: string): string {
  let hash = 0
  for (let i = 0; i < interest.length; i++) hash = ((hash << 5) - hash + interest.charCodeAt(i)) | 0
  return INTEREST_COLORS[Math.abs(hash) % INTEREST_COLORS.length]!
}

const WIRE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  none:     { label: 'Dashboard Only', className: 'bg-t-surface-el text-t-text-3 border-t-edge' },
  auto:     { label: 'On The Wire',    className: 'bg-green-950/40 text-green-400 border-green-800/40' },
  pending:  { label: 'Pending Review', className: 'bg-amber-950/40 text-amber-400 border-amber-800/40' },
  approved: { label: 'On The Wire',    className: 'bg-green-950/40 text-green-400 border-green-800/40' },
  rejected: { label: 'Not Approved',   className: 'bg-red-950/40 text-red-400 border-red-800/40' },
}

const CATEGORY_COLORS: Record<string, string> = {
  'Environmental Science':    'bg-green-950/60 text-green-400 border-green-800/40',
  'History & Politics':       'bg-red-950/60 text-red-400 border-red-800/40',
  'Law & Jurisprudence':      'bg-blue-950/60 text-blue-400 border-blue-800/40',
  'Medicine & Healthcare':    'bg-pink-950/60 text-pink-400 border-pink-800/40',
  'Philosophy & Ethics':      'bg-purple-950/60 text-purple-400 border-purple-800/40',
  'Rhetoric & Persuasion':    'bg-orange-950/60 text-orange-400 border-orange-800/40',
  'Statistics & Data Science':'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
  'Technology & Innovation':  'bg-amber-950/60 text-amber-400 border-amber-800/40',
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (days  > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins  > 0) return `${mins}m ago`
  return 'just now'
}

export default function MyReportsPage() {
  const { user, profile } = useAuth()
  const [reports, setReports] = useState<ReporterCall[]>([])
  const [presets, setPresets] = useState<UserPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const hasInterests = (profile?.interests ?? []).length > 0

  useEffect(() => {
    if (!user) { setLoading(false); return }

    const db = getSupabaseBrowserClient()

    // Fetch reports + presets in parallel
    Promise.all([
      db.from('reporter_calls')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      db.from('user_presets')
        .select('id, title, query_template, interest, sort_order')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]).then(([reportsRes, presetsRes]) => {
      setReports((reportsRes.data ?? []) as ReporterCall[])
      setPresets((presetsRes.data ?? []) as UserPreset[])
      setLoading(false)
    })
  }, [user])

  async function handleRefreshPresets() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/presets/generate', { method: 'POST' })
      if (res.ok) {
        // Refetch presets
        const db = getSupabaseBrowserClient()
        const { data } = await db
          .from('user_presets')
          .select('id, title, query_template, interest, sort_order')
          .eq('user_id', user!.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
        setPresets((data ?? []) as UserPreset[])
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? 'Failed to refresh')
      }
    } catch {
      alert('Something went wrong')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <h1 className="text-2xl font-bold text-t-text mb-6">My Reports</h1>
        <div className="flex items-center justify-center py-16">
          <div className="size-6 border-2 border-t-text-3 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 w-full overflow-hidden">
      <h1 className="text-2xl font-bold text-t-text mb-6">My Reports</h1>

      {/* ── Recommended Presets ── */}
      {!loading && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-t-text-3">Recommended for You</p>
          </div>

          {presets.length > 0 ? (
            <>
              <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-3 pb-2 snap-x snap-mandatory">
                {presets.map((preset) => (
                  <Link
                    key={preset.id}
                    href={`/?query=${encodeURIComponent(preset.query_template)}`}
                    className="snap-start shrink-0 w-[72vw] sm:w-[280px] rounded-xl border border-t-edge bg-t-surface overflow-hidden shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg group"
                  >
                    {preset.interest && (
                      <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${interestColor(preset.interest)}`}>
                        {preset.interest}
                      </div>
                    )}
                    <div className="p-3 sm:p-3.5">
                      <p className="text-sm font-semibold text-t-text leading-snug group-hover:text-t-accent-text transition mb-1">
                        {preset.title}
                      </p>
                      <p className="text-xs text-t-text-3 leading-relaxed line-clamp-3">
                        {preset.query_template}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              </div>

              {hasInterests && (
                <button
                  onClick={handleRefreshPresets}
                  disabled={refreshing}
                  className="w-full mt-3 rounded-xl border border-t-edge bg-t-surface py-3 text-sm font-medium text-t-text-2 hover:bg-t-hover transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Generating new suggestions...' : 'Refresh Suggestions (1 credit)'}
                </button>
              )}
            </>
          ) : hasInterests ? (
            /* Has interests but no presets generated yet */
            <div className="rounded-xl border border-t-edge bg-t-surface p-5 text-center shadow-t">
              <Sparkles className="size-6 text-t-accent-text mx-auto mb-2" />
              <p className="text-sm font-medium text-t-text mb-1">Generate your first recommendations</p>
              <p className="text-xs text-t-text-3 mb-4">AI-powered search suggestions based on your interests.</p>
              <button
                onClick={handleRefreshPresets}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg bg-t-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
              >
                {refreshing ? <RefreshCw className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {refreshing ? 'Generating...' : 'Generate Suggestions (1 credit)'}
              </button>
            </div>
          ) : (
            /* No interests set */
            <div className="rounded-xl border border-t-accent/30 bg-t-accent-soft p-4 flex items-center gap-3">
              <Sparkles className="size-5 text-t-accent-text shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-t-text">Get personalized report suggestions</p>
                <p className="text-xs text-t-text-3">Set your interests to unlock daily recommended topics.</p>
              </div>
              <Link href="/my/settings" className="shrink-0 rounded-lg bg-t-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition">
                <Settings className="inline size-3 mr-1" />
                Set Interests
              </Link>
            </div>
          )}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-t-edge bg-t-surface p-8 sm:p-12 shadow-t text-center">
          <div className="size-14 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center mx-auto mb-4">
            <FileText className="size-6 text-t-text-4" />
          </div>
          <h2 className="text-base font-semibold text-t-text mb-1">No reports yet</h2>
          <p className="text-sm text-t-text-3 mb-5 max-w-xs mx-auto">
            Reports you generate will appear here. Go to the home page to call The Reporter.
          </p>
          <a href="/" className="inline-flex rounded-xl bg-t-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
            <Phone className="size-4 mr-1.5" />
            Call The Reporter
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const badge = WIRE_STATUS_BADGE[report.wire_status] ?? { label: 'Dashboard Only', className: 'bg-t-surface-el text-t-text-3 border-t-edge' }
            return (
              <Link key={report.id} href={`/reports/${report.slug}`} className="block group">
                <article className="rounded-xl border border-t-edge bg-t-surface p-4 shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg min-w-0 overflow-hidden">
                  {/* Top row: category + wire status */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {report.report_category && (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_COLORS[report.report_category] ?? 'bg-t-badge text-t-text-2 border-t-badge-border'}`}>
                        {report.report_category}
                      </span>
                    )}
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Headline */}
                  <h3 className="text-sm font-semibold text-t-text leading-snug mb-1.5 group-hover:text-t-accent-text transition break-words">
                    {report.report_headline ?? 'Untitled Report'}
                  </h3>

                  {/* Summary */}
                  {report.call_summary && (
                    <p className="text-xs text-t-text-2 leading-relaxed mb-3 line-clamp-2 break-words">
                      {report.call_summary}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-t-edge-muted">
                    <div className="flex items-center gap-3 text-[11px] text-t-text-3">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatAge(report.created_at)}
                      </span>
                      {report.source_count != null && report.source_count > 0 && (
                        <span>{report.source_count} {report.source_count === 1 ? 'source' : 'sources'}</span>
                      )}
                      {report.call_language && report.call_language !== 'en-US' && (
                        <span className="flex items-center gap-1">
                          <Globe className="size-3" />
                          {report.call_language.split('-')[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-t-text-4 group-hover:text-t-accent-text transition" />
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
