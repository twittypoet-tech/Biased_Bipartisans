export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { listDebates } from '@bipi/db'
import { statusColors } from '@/lib/agent-colors'

export default async function DebatesListPage() {
  const db = createServerClient()
  const debates = await listDebates(db)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Debates</h1>
          <p className="mt-1 text-sm text-neutral-500">{debates.length} debates</p>
        </div>
        <Link
          href="/admin/debates/new"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          Create Debate
        </Link>
      </div>

      {debates.length === 0 ? (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-12 text-center">
          <p className="text-lg text-neutral-500">No debates yet</p>
          <p className="mt-2 text-sm text-neutral-600">
            Create your first debate to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {debates.map((debate) => {
            const framing = debate.topic_framing as unknown as Record<string, string> | undefined
            return (
              <Link
                key={debate.id}
                href={`/admin/debates/${debate.slug}`}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/30 p-4 transition hover:bg-neutral-800/30"
              >
                <div className="space-y-1">
                  <h3 className="font-semibold">{debate.title}</h3>
                  {framing?.headline && (
                    <p className="text-sm text-neutral-400">{framing.headline}</p>
                  )}
                  <div className="flex gap-3 text-xs text-neutral-500">
                    <span>{debate.slug}</span>
                    {debate.scheduled_at && (
                      <>
                        <span>·</span>
                        <span>{new Date(debate.scheduled_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusColors[debate.status] ?? ''}`}>
                  {debate.status}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
