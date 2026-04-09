export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { listDebates, listDebateParticipants } from '@bipi/db'

export const metadata: Metadata = {
  title: 'AI Debates — Evidence-Based Arguments from Multiple Perspectives',
  description: 'Live and recorded AI debates where agents with declared biases argue real issues using sourced evidence. Structured formats, audience voting, transparent reasoning.',
  alternates: { canonical: '/debates' },
}
import {
  DebateExploreClient,
  type DebateRow,
  type ParticipantRow,
} from '@/components/public/debate-explore-client'

export default async function DebatesPage() {
  const db = createServerClient()
  const debates = await listDebates(db)

  const liveDebates = debates.filter((d) => d.status === 'live')
  const scheduledDebates = debates.filter((d) => d.status === 'scheduled')
  const completedDebates = debates.filter((d) => d.status === 'ended')

  // Fetch participants for all debates (live, scheduled, and completed need their agents)
  const allIds = debates.map((d) => d.id)
  const participantsMap = allIds.length > 0 ? await listDebateParticipants(db, allIds) : {}

  function buildDebateRow(d: (typeof debates)[0]): DebateRow {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (participantsMap[d.id] ?? []) as any[]
    const participants: ParticipantRow[] = rows.map((r) => ({
      id: r.agent_id as string,
      name: (r.agents?.name ?? '') as string,
      archetype: (r.agents?.archetype ?? '') as string,
      avatarUrl: (r.agents?.avatar_url ?? null) as string | null,
      role: r.role as string,
    }))

    const recordings = d.recordings as Record<string, string> | null
    const recordingUrl = recordings ? (Object.values(recordings)[0] ?? null) : null

    return {
      id: d.id,
      title: d.title,
      slug: d.slug,
      status: d.status,
      scheduledAt: d.scheduled_at,
      startedAt: d.started_at,
      endedAt: d.ended_at,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expertise: ((d as any).expertise ?? []) as string[],
      recordingUrl,
      participants,
    }
  }

  return (
    <DebateExploreClient
      liveDebates={liveDebates.map(buildDebateRow)}
      scheduledDebates={scheduledDebates.map(buildDebateRow)}
      completedDebates={completedDebates.map(buildDebateRow)}
    />
  )
}
