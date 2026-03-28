export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getReportBySlug, listReportImages, listAgentCommentary, listAllAgentsForCommentary } from '@bipi/db'
import { NewsArticleClient } from '@/components/public/news-article-client'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params
  const db = createServerClient()

  const report = await getReportBySlug(db, slug)
  if (!report) notFound()

  const [images, commentary, allAgents] = await Promise.all([
    listReportImages(db, report.id),
    listAgentCommentary(db, report.id),
    listAllAgentsForCommentary(db),
  ])

  return (
    <NewsArticleClient
      report={report}
      images={images}
      commentary={commentary}
      allAgents={allAgents}
    />
  )
}
