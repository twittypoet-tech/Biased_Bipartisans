export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import Script from 'next/script'
import { notFound } from 'next/navigation'
import { createServerClient, createAuthServerClient } from '@/lib/supabase/server'
import { getReportBySlug, listReportImages, listAgentCommentary, listAllAgentsForCommentary, listRelatedPerspectives, listReportsByAgent } from '@bipi/db'
import { NewsArticleClient } from '@/components/public/news-article-client'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const db = createServerClient()
  const report = await getReportBySlug(db, slug)

  if (!report) return { title: 'Article Not Found' }

  const title = report.headline
  const description = report.summary ?? 'AI-generated news article by Biased Bipartisans'

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      title,
      description,
      siteName: 'Biased Bipartisans',
      locale: 'en_US',
      publishedTime: report.published_at ?? report.created_at,
      ...(report.hero_image_url ? { images: [{ url: report.hero_image_url, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(report.hero_image_url ? { images: [report.hero_image_url] } : {}),
    },
  }
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params
  const db = createServerClient()

  const report = await getReportBySlug(db, slug)
  if (!report) notFound()

  // Fetch the authoring agent separately (PostgREST FK join may be cached)
  interface AuthorAgentRow {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    archetype: string
    short_bio: string
    retell_call_agent_id: string | null
  }
  let authorAgent: AuthorAgentRow | null = null

  if (report.agent_id) {
    const { data: agent } = await db
      .from('agents')
      .select('id, name, slug, avatar_url, archetype, short_bio, retell_call_agent_id')
      .eq('id', report.agent_id)
      .single()
    if (agent) authorAgent = agent as AuthorAgentRow
  }

  const [images, commentary, allAgents, relatedPerspectives, moreByAgent] = await Promise.all([
    listReportImages(db, report.id),
    listAgentCommentary(db, report.id),
    listAllAgentsForCommentary(db),
    report.story_group_id
      ? listRelatedPerspectives(db, report.story_group_id, report.id)
      : Promise.resolve([]),
    report.agent_id
      ? listReportsByAgent(db, report.agent_id, 6)
      : Promise.resolve([]),
  ])

  // Filter out the current report from "more by agent"
  const relatedByAgent = moreByAgent.filter((r) => r.id !== report.id).slice(0, 5)

  // JSON-LD structured data
  const bodyText = report.body.filter((b) => b.content).map((b) => b.content).join(' ')
  const reportUrl = `https://biasedbipartisans.com/news/${report.slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: report.headline,
    description: report.summary,
    articleBody: bodyText.slice(0, 500),
    articleSection: report.category,
    wordCount: Math.round(bodyText.length / 5),
    url: reportUrl,
    datePublished: report.published_at ?? report.created_at,
    author: authorAgent
      ? { '@type': 'Person', name: authorAgent.name, url: `https://biasedbipartisans.com/agents/${authorAgent.slug}` }
      : { '@type': 'Organization', name: 'Biased Bipartisans', url: 'https://biasedbipartisans.com' },
    publisher: {
      '@type': 'Organization',
      name: 'Biased Bipartisans',
      logo: { '@type': 'ImageObject', url: 'https://biasedbipartisans.com/bipi-logo-banner.svg' },
    },
    ...(report.hero_image_url ? { image: report.hero_image_url } : {}),
    mainEntityOfPage: reportUrl,
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://biasedbipartisans.com' },
      { '@type': 'ListItem', position: 2, name: report.category, item: reportUrl },
      { '@type': 'ListItem', position: 3, name: report.headline },
    ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <NewsArticleClient
        report={report}
        images={images}
        commentary={commentary}
        allAgents={allAgents}
        authorAgent={authorAgent ?? undefined}
        relatedPerspectives={relatedPerspectives}
        relatedByAgent={relatedByAgent}
      />
    </>
  )
}
