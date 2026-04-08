export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import {
  getAgentBySlug,
  getActiveWorldview,
  getActiveStyleProfile,
  getActivePhraseBank,
  getActiveEpistemicProfile,
  getAgentRelationships,
  getEvalRunsForAgent,
  getAgentCommentaryVotes,
  listAgentReportCommentary,
  getReporterAggregateVotes,
  listReportsByAgent,
} from '@bipi/db'
import { getArchetypeColor } from '@/lib/agent-colors'
import { AgentProfileClient, type AgentProfileData } from '@/components/public/agent-profile-client'

interface Props {
  params: Promise<{ slug: string }>
}

const archetypeLabels: Record<string, string> = {
  hawk: 'Hawk',
  dove: 'Dove',
  technocrat: 'Technocrat',
  populist: 'Populist',
  cynic: 'Cynic',
  conspiracy_theorist: 'Conspiracy Theorist',
  institutionalist: 'Institutionalist',
  libertarian: 'Libertarian',
}

export default async function AgentProfilePage({ params }: Props) {
  const { slug } = await params
  const db = createServerClient()
  const agent = await getAgentBySlug(db, slug)

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-200">Agent not found</h1>
        <Link
          href="/agents"
          className="mt-4 inline-block text-sm text-neutral-400 hover:text-white transition"
        >
          ← Back to agents
        </Link>
      </div>
    )
  }

  const [worldview, style, phrases, epistemic, relationships, evalRuns, commentaryVotes, agentCommentary, agentArticles] = await Promise.all([
    getActiveWorldview(db, agent.id),
    getActiveStyleProfile(db, agent.id),
    getActivePhraseBank(db, agent.id),
    getActiveEpistemicProfile(db, agent.id),
    getAgentRelationships(db, agent.id),
    getEvalRunsForAgent(db, agent.id, 10),
    getAgentCommentaryVotes(db, agent.id),
    listAgentReportCommentary(db, agent.id, 20),
    listReportsByAgent(db, agent.id, 50),
  ])

  // Fetch debate metadata for eval runs
  const debateIds = [...new Set(evalRuns.map((r) => r.debate_id))]
  const { data: relatedDebates } = debateIds.length > 0
    ? await db
        .from('debates')
        .select('id, title, slug, ended_at')
        .in('id', debateIds)
    : { data: [] as Array<{ id: string; title: string; slug: string; ended_at: string | null }> }
  const debateMap = new Map((relatedDebates ?? []).map((d) => [d.id, d]))

  // Compute average composite score
  const scoredRuns = evalRuns.filter((r) => r.composite_score != null)
  const avgComposite =
    scoredRuns.length > 0
      ? scoredRuns.reduce((sum, r) => sum + (r.composite_score ?? 0), 0) / scoredRuns.length
      : null

  // For The Reporter: aggregate report votes across all published reports
  const isReporter = agent.slug === 'the-reporter'
  const reporterVotes = isReporter ? await getReporterAggregateVotes(db) : null

  const colors = getArchetypeColor(agent.archetype)

  // Build serializable profile data for the client component
  const profileData: AgentProfileData = {
    agent: {
      id: agent.id,
      name: agent.name,
      archetype: agent.archetype,
      archetypeLabel: archetypeLabels[agent.archetype] ?? agent.archetype,
      evolutionStage: agent.evolution_stage,
      shortBio: agent.short_bio ?? null,
      introAudioUrl: agent.intro_audio_url ?? null,
      avatarUrl: agent.avatar_url ?? null,
      expertise: (agent.expertise as string[]) ?? [],
    },
    worldview: worldview
      ? {
          coreThesis: worldview.core_thesis,
          values: (worldview.values as string[]) ?? [],
          doctrine: (worldview.doctrine as string[]) ?? [],
          redLines: (worldview.red_lines as string[]) ?? [],
        }
      : null,
    style: style
      ? {
          temperament: style.temperament,
          tone: style.tone,
          pace: style.pace,
          sentenceStyle: style.sentence_style,
          rhetoricalOs: (style.rhetorical_os as string[]) ?? [],
          rhetoricalDevices: (style.rhetorical_devices as string[]) ?? [],
          signatureBehaviors: (style.signature_behaviors as string[]) ?? [],
        }
      : null,
    phrases: phrases
      ? {
          openers: (phrases.openers as string[]) ?? [],
          attacks: (phrases.attacks as string[]) ?? [],
          closers: (phrases.closers as string[]) ?? [],
        }
      : null,
    hardLimits: epistemic ? ((epistemic.epistemic_red_lines as string[]) ?? []) : [],
    relationships: (relationships ?? []).map((rel) => ({
      id: rel.id,
      relationshipType: rel.relationship_type,
      respectScore: rel.respect_score,
      rivalryScore: rel.rivalry_score,
      attackAngles: (rel.attack_angles as string[]) ?? [],
      targetName: rel.target_name ?? null,
      targetSlug: rel.target_slug ?? null,
      targetAvatarUrl: rel.target_avatar_url ?? null,
    })),
    recentDebates: evalRuns.map((run) => {
      const debate = debateMap.get(run.debate_id)
      return {
        id: run.id,
        debateTitle: debate?.title ?? 'Unknown debate',
        debateSlug: debate?.slug ?? null,
        score: run.composite_score ?? null,
        endedAt: debate?.ended_at ?? null,
      }
    }),
    articles: agentArticles.map((a) => ({
      id: a.id,
      slug: a.slug,
      headline: a.headline,
      category: a.category,
      hero_image_url: a.hero_image_url,
      published_at: a.published_at,
      view_count: a.view_count ?? 0,
    })),
    agentCommentary: agentCommentary.map((c) => ({
      id: c.id,
      transcript: c.transcript,
      audio_url: c.audio_url,
      duration_seconds: c.duration_seconds,
      upvotes: c.upvotes,
      downvotes: c.downvotes,
      created_at: c.created_at,
      report_headline: c.report_headline ?? null,
      report_slug: c.report_slug ?? null,
      report_category: c.report_category ?? null,
    })),
    stats: {
      totalDebates: evalRuns.length,
      avgScore: avgComposite,
      totalViews: agentArticles.reduce((sum, a) => sum + (a.view_count ?? 0), 0),
      commentaryUpvotes: (reporterVotes?.upvotes ?? 0) + commentaryVotes.upvotes,
      commentaryDownvotes: (reporterVotes?.downvotes ?? 0) + commentaryVotes.downvotes,
    },
    colors,
  }

  return <AgentProfileClient data={profileData} />
}
