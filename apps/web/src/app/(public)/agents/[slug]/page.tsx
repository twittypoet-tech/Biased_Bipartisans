export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getAgentBySlug, getActiveWorldview, getActiveStyleProfile, getActivePhraseBank, getActiveEpistemicProfile, getAgentRelationships } from '@bipi/db'
import { getArchetypeColor } from '@/lib/agent-colors'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AgentProfilePage({ params }: Props) {
  const { slug } = await params
  const db = createServerClient()
  const agent = await getAgentBySlug(db, slug)

  if (!agent) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Agent not found</h1>
        <Link href="/agents" className="mt-4 inline-block text-sm text-neutral-400 hover:text-white transition">
          Back to agents
        </Link>
      </div>
    )
  }

  const [worldview, style, phrases, epistemic, relationships] = await Promise.all([
    getActiveWorldview(db, agent.id),
    getActiveStyleProfile(db, agent.id),
    getActivePhraseBank(db, agent.id),
    getActiveEpistemicProfile(db, agent.id),
    getAgentRelationships(db, agent.id),
  ])

  const colors = getArchetypeColor(agent.archetype)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Hero */}
      <div className={`rounded-xl border ${colors.border} ${colors.bg} p-8`}>
        <div className="flex items-start justify-between">
          <div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${colors.badge}`}>
              {agent.archetype.replace('_', ' ')}
            </span>
            <h1 className={`mt-3 text-4xl font-bold ${colors.text}`}>{agent.name}</h1>
            <p className="mt-2 text-neutral-400">{agent.short_bio}</p>
          </div>
          <div className="text-right text-xs text-neutral-600">
            <div>Powered by {agent.llm_provider === 'anthropic' ? 'Claude' : 'GPT-4o'}</div>
            <div className="mt-1 capitalize">{agent.evolution_stage.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {/* Worldview */}
        {worldview && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Worldview</h2>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-neutral-500 mb-1">Core Thesis</h3>
                <p className="text-neutral-200">{worldview.core_thesis}</p>
              </div>
              {worldview.values && worldview.values.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Values</h3>
                  <div className="flex flex-wrap gap-2">
                    {worldview.values.map((v: string, i: number) => (
                      <span key={i} className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {worldview.doctrine && worldview.doctrine.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Doctrine</h3>
                  <ul className="space-y-1 text-sm text-neutral-300">
                    {worldview.doctrine.map((d: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-neutral-600 shrink-0">&bull;</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {worldview.red_lines && worldview.red_lines.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-400/80 mb-2">Red Lines</h3>
                  <ul className="space-y-1 text-sm text-neutral-400">
                    {worldview.red_lines.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-red-800 shrink-0">&bull;</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Style */}
        {style && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Debate Style</h2>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-neutral-500">Temperament</span>
                  <p className="text-neutral-200 capitalize">{style.temperament.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-sm text-neutral-500">Tone</span>
                  <p className="text-neutral-200">{style.tone}</p>
                </div>
                <div>
                  <span className="text-sm text-neutral-500">Pace</span>
                  <p className="text-neutral-200">{style.pace}</p>
                </div>
                <div>
                  <span className="text-sm text-neutral-500">Sentence Style</span>
                  <p className="text-neutral-200">{style.sentence_style}</p>
                </div>
              </div>
              {style.signature_behaviors && style.signature_behaviors.length > 0 && (
                <div className="mt-4">
                  <span className="text-sm text-neutral-500">Signature Behaviors</span>
                  <ul className="mt-1 space-y-1 text-sm text-neutral-300">
                    {style.signature_behaviors.map((b: string, i: number) => (
                      <li key={i}>&bull; {b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Signature Phrases */}
        {phrases && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Signature Phrases</h2>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6 space-y-4">
              {phrases.openers && phrases.openers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Openers</h3>
                  <div className="space-y-1">
                    {phrases.openers.map((p: string, i: number) => (
                      <p key={i} className={`text-sm ${colors.text} italic`}>&ldquo;{p}&rdquo;</p>
                    ))}
                  </div>
                </div>
              )}
              {phrases.attacks && phrases.attacks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Attack Lines</h3>
                  <div className="space-y-1">
                    {phrases.attacks.map((p: string, i: number) => (
                      <p key={i} className="text-sm text-neutral-300 italic">&ldquo;{p}&rdquo;</p>
                    ))}
                  </div>
                </div>
              )}
              {phrases.closers && phrases.closers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-2">Closers</h3>
                  <div className="space-y-1">
                    {phrases.closers.map((p: string, i: number) => (
                      <p key={i} className="text-sm text-neutral-300 italic">&ldquo;{p}&rdquo;</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Epistemic Profile */}
        {epistemic && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Epistemic Profile</h2>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6 space-y-3 text-sm">
              <div>
                <span className="text-neutral-500">Default claim tendency: </span>
                <span className="text-neutral-200 capitalize">{epistemic.default_claim_tier_tendency.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-neutral-500">Speculation tolerance: </span>
                <span className="text-neutral-200">{Math.round(epistemic.speculation_tolerance * 100)}%</span>
              </div>
              {epistemic.evidence_preferences && epistemic.evidence_preferences.length > 0 && (
                <div>
                  <span className="text-neutral-500">Evidence preferences: </span>
                  <span className="text-neutral-300">{epistemic.evidence_preferences.join(', ')}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Relationships */}
        {relationships && relationships.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Rivalries & Alliances</h2>
            <div className="space-y-2">
              {relationships.map((rel) => {
                const targetColors = getArchetypeColor((rel as unknown as Record<string, string>).target_archetype ?? '')
                return (
                  <div key={rel.id} className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-200">
                        {rel.relationship_type.replace('_', ' ')}
                      </span>
                      <div className="flex gap-3 text-xs text-neutral-500">
                        <span>Respect: {Math.round(rel.respect_score * 100)}%</span>
                        <span>Rivalry: {Math.round(rel.rivalry_score * 100)}%</span>
                      </div>
                    </div>
                    {rel.attack_angles && rel.attack_angles.length > 0 && (
                      <p className="mt-2 text-xs text-neutral-500">
                        Attack angles: {rel.attack_angles.join(' | ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
