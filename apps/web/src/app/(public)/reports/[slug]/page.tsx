export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Script from 'next/script'
import { notFound } from 'next/navigation'
import { createServerClient, createAuthServerClient } from '@/lib/supabase/server'
import { getReporterCallBySlug, listReportCommentary, getRelatedReports } from '@bipi/db'
import { listAgents } from '@bipi/db'
import { ReportDetailClient } from '@/components/public/report-detail-client'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const db = createServerClient()
  const report = await getReporterCallBySlug(db, slug)

  if (!report) return { title: 'Report Not Found' }

  const title = report.report_headline ?? 'Report'
  const description = report.call_summary ?? 'AI-generated news report by Biased Bipartisans'
  const keywords = [
    report.report_category,
    ...(report.key_entities?.split(',').map(e => e.trim()) ?? []),
    'AI news', 'news report', 'Biased Bipartisans',
  ].filter(Boolean) as string[]

  return {
    title,
    description,
    keywords: keywords.join(', '),
    openGraph: {
      type: 'article',
      title,
      description,
      siteName: 'Biased Bipartisans',
      locale: 'en_US',
      publishedTime: report.created_at,
      ...(report.report_image_url ? { images: [{ url: report.report_image_url, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(report.report_image_url ? { images: [report.report_image_url] } : {}),
    },
  }
}

export default async function ReportDetailPage({ params }: PageProps) {
  const { slug } = await params
  const db = createServerClient()

  // Get authenticated user (if any) for owner access
  let viewerUserId: string | null = null
  try {
    const authClient = await createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    viewerUserId = user?.id ?? null
  } catch {
    // Not authenticated — fine, continue as public viewer
  }

  const report = await getReporterCallBySlug(db, slug, viewerUserId)
  if (!report) notFound()

  const isOwner = viewerUserId != null && report.user_id === viewerUserId

  const [commentary, allAgents, relatedReports] = await Promise.all([
    listReportCommentary(db, report.id),
    listAgents(db),
    getRelatedReports(db, report.id, report.key_entities, report.user_query, report.report_category),
  ])

  const agentsForCommentary = allAgents
    .filter((a) => a.role !== 'moderator')
    .map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      avatarUrl: a.avatar_url,
      archetype: a.archetype,
      shortBio: a.short_bio,
    }))

  // JSON-LD structured data for Google News / rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: report.report_headline ?? 'Report',
    description: report.call_summary ?? '',
    datePublished: report.created_at,
    author: { '@type': 'Organization', name: 'Biased Bipartisans' },
    publisher: {
      '@type': 'Organization',
      name: 'Biased Bipartisans',
      logo: { '@type': 'ImageObject', url: 'https://biasedbipartisans.com/bipi-mark.svg' },
    },
    ...(report.report_image_url ? { image: report.report_image_url } : {}),
    mainEntityOfPage: `https://biasedbipartisans.com/reports/${report.slug}`,
  }

  return (
    <>
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3338044547412009"
        crossOrigin="anonymous"
        strategy="lazyOnload"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReportDetailClient
        report={report}
        commentary={commentary}
        agents={agentsForCommentary}
        isOwner={isOwner}
        relatedReports={relatedReports}
      />
    </>
  )
}
