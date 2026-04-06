'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, Phone, Globe, Clock, ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ReporterCall } from '@bipi/shared'

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
  const { user } = useAuth()
  const [reports, setReports] = useState<ReporterCall[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    const db = getSupabaseBrowserClient()
    db.from('reporter_calls')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReports((data ?? []) as ReporterCall[])
        setLoading(false)
      })
  }, [user])

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
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-t-text mb-6">My Reports</h1>

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
                <article className="rounded-xl border border-t-edge bg-t-surface p-4 shadow-t transition hover:border-t-edge-strong hover:shadow-t-lg">
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
                  <h3 className="text-sm font-semibold text-t-text leading-snug mb-1.5 group-hover:text-t-accent-text transition">
                    {report.report_headline ?? 'Untitled Report'}
                  </h3>

                  {/* Summary */}
                  {report.call_summary && (
                    <p className="text-xs text-t-text-2 leading-relaxed mb-3 line-clamp-2">
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
