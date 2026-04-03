export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getReporterCallBySlug, listReportCommentary } from '@bipi/db'
import { listAgents } from '@bipi/db'
import { ReportDetailClient } from '@/components/public/report-detail-client'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const db = createServerClient()
  const report = await getReporterCallBySlug(db, slug)

  if (!report) return { title: 'Report Not Found — Bipi' }

  return {
    title: `${report.report_headline ?? 'Report'} — Bipi`,
    description: report.call_summary ?? undefined,
    openGraph: {
      title: report.report_headline ?? 'Report',
      description: report.call_summary ?? undefined,
      ...(report.report_image_url ? { images: [report.report_image_url] } : {}),
    },
  }
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { slug } = await params
  const db = createServerClient()

  const report = await getReporterCallBySlug(db, slug)
  if (!report) notFound()

  const [commentary, allAgents] = await Promise.all([
    listReportCommentary(db, report.id),
    listAgents(db),
  ])

  const agentsForCommentary = allAgents
    .filter((a) => a.role !== 'moderator')
    .map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      avatarUrl: a.avatar_url,
      archetype: a.archetype,
    }))

  return (
    <ReportDetailClient
      report={report}
      commentary={commentary}
      agents={agentsForCommentary}
    />
  )
}
