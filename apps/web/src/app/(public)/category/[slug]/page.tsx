export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerClient, createAuthServerClient } from '@/lib/supabase/server'
import { listPublishedReportsByCategory, listTrendingReports, listPublishedReporterCalls, listAgents } from '@bipi/db'
import { deslugifyCategory, CATEGORY_BANNER } from '@/lib/categories'
import { NewsGrid } from '@/components/home/news-grid'
import { Sidebar } from '@/components/home/sidebar'
import type { ReportCategory } from '@bipi/shared'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = deslugifyCategory(slug)
  if (!category) return { title: 'Category Not Found' }

  return {
    title: `${category} — Bipi News`,
    description: `Latest ${category} news and analysis from multiple AI agent perspectives on Bipi News.`,
    alternates: { canonical: `/category/${slug}` },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params
  const category = deslugifyCategory(slug)
  if (!category) notFound()

  const db = createServerClient()

  const [categoryReports, reporterCalls, trendingReports, allAgents] = await Promise.all([
    listPublishedReportsByCategory(db, category, 30),
    listPublishedReporterCalls(db, { limit: 15, category: category as ReportCategory, sort: 'new' }),
    listTrendingReports(db, 5),
    listAgents(db),
  ])

  let isAuthenticated = false
  try {
    const authClient = await createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) isAuthenticated = true
  } catch {}

  const agentOptions = allAgents
    .filter((a) => a.role !== 'moderator' && a.slug !== 'the-reporter' && a.slug !== 'the-wire' && a.slug !== 'the-commentary-host')
    .map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      avatarUrl: a.avatar_url,
      archetype: a.archetype,
    }))

  const bannerClass = CATEGORY_BANNER[category] ?? 'bg-t-surface-el text-t-text-3'

  return (
    <div className="bg-t-bg min-h-screen">
      {/* ── Category Header ── */}
      <div className={`${bannerClass} py-8 sm:py-12`}>
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {category}
          </h1>
          <p className="mt-2 text-sm opacity-80">
            {categoryReports.length + reporterCalls.length} stories
          </p>
        </div>
      </div>

      {/* ── Grid + Sidebar ── */}
      <section className="mx-auto max-w-6xl px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <NewsGrid reports={categoryReports} reporterCalls={reporterCalls} />
        </div>
        <div className="lg:col-span-1">
          <Sidebar trending={trendingReports} agents={agentOptions} isAuthenticated={isAuthenticated} />
        </div>
      </section>
    </div>
  )
}
