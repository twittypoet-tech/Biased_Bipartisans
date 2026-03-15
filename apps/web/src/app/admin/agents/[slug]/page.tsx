import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import {
  getAgentBySlug,
  getActiveWorldview,
  getActiveStyleProfile,
  getActivePhraseBank,
  getActiveEpistemicProfile,
  getAgentRelationships,
  listAgents,
} from '@bipi/db'
import { getArchetypeColor, statusColors } from '@/lib/agent-colors'
import { ConfigSection, DataList, TagList, MeterBar } from '@/components/admin/config-section'

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const db = createServerClient()
  const agent = await getAgentBySlug(db, slug)
  if (!agent) notFound()

  const [worldview, style, phrases, epistemic, relationships, allAgents] = await Promise.all([
    getActiveWorldview(db, agent.id),
    getActiveStyleProfile(db, agent.id),
    getActivePhraseBank(db, agent.id),
    getActiveEpistemicProfile(db, agent.id),
    getAgentRelationships(db, agent.id),
    listAgents(db),
  ])

  const agentMap = Object.fromEntries(allAgents.map((a) => [a.id, a]))
  const colors = getArchetypeColor(agent.archetype)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-lg border ${colors.border} ${colors.bg} p-6`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <div className="mt-2 flex gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${colors.badge}`}>
                {agent.archetype.replace(/_/g, ' ')}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusColors[agent.status] ?? ''}`}>
                {agent.status}
              </span>
              <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-400">
                {agent.role}
              </span>
              <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-400">
                {agent.evolution_stage}
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <p>{agent.llm_provider} / {agent.llm_model}</p>
            {agent.voice_id && <p>Voice: {agent.voice_id}</p>}
          </div>
        </div>
        <p className="mt-3 text-sm text-neutral-300">{agent.short_bio}</p>
      </div>

      {/* Worldview */}
      {worldview && (
        <ConfigSection title="Worldview" version={worldview.version} status={worldview.status} defaultOpen>
          <div className="space-y-4">
            <div>
              <h4 className="mb-1 text-xs font-medium uppercase text-neutral-500">Core Thesis</h4>
              <p className="text-sm">{worldview.core_thesis}</p>
            </div>

            <div>
              <h4 className="mb-1 text-xs font-medium uppercase text-neutral-500">Doctrine</h4>
              <ul className="space-y-1">
                {worldview.doctrine.map((d, i) => (
                  <li key={i} className="text-sm text-neutral-300">· {d}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-medium uppercase text-neutral-500">Values</h4>
              <TagList tags={worldview.values} color="blue" />
            </div>

            <div>
              <h4 className="mb-1 text-xs font-medium uppercase text-neutral-500">Issue Lenses</h4>
              <DataList
                items={Object.entries(worldview.issue_lenses as Record<string, string>).map(
                  ([domain, lens]) => ({ label: domain, value: lens }),
                )}
              />
            </div>

            <div>
              <h4 className="mb-1 text-xs font-medium uppercase text-neutral-500">Belief Rules</h4>
              <ul className="space-y-1">
                {worldview.belief_rules.map((r, i) => (
                  <li key={i} className="text-sm text-neutral-400">· {r}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-medium uppercase text-neutral-500">Red Lines</h4>
              <TagList tags={worldview.red_lines} color="red" />
            </div>
          </div>
        </ConfigSection>
      )}

      {/* Style Profile */}
      {style && (
        <ConfigSection title="Style Profile" version={style.version} status={style.status}>
          <div className="space-y-4">
            <DataList
              items={[
                { label: 'Temperament', value: style.temperament },
                { label: 'Tone', value: style.tone },
                { label: 'Pace', value: style.pace },
                { label: 'Sentence Style', value: style.sentence_style },
              ]}
            />

            <div className="space-y-2">
              <MeterBar label="Humor" value={style.humor_level} />
              <MeterBar label="Certainty" value={style.certainty_level} />
              <MeterBar label="Interruption" value={style.interruption_tendency} />
              <MeterBar label="Abstraction" value={style.abstraction_level} />
              <MeterBar label="Warmth" value={style.warmth} />
            </div>

            <div>
              <h4 className="mb-2 text-xs font-medium uppercase text-neutral-500">Rhetorical OS</h4>
              <TagList tags={style.rhetorical_os.map((r) => r.replace(/_/g, ' '))} />
            </div>

            <div>
              <h4 className="mb-2 text-xs font-medium uppercase text-neutral-500">Rhetorical Devices</h4>
              <TagList tags={style.rhetorical_devices} />
            </div>

            <div>
              <h4 className="mb-1 text-xs font-medium uppercase text-neutral-500">Signature Behaviors</h4>
              <ul className="space-y-1">
                {style.signature_behaviors.map((b, i) => (
                  <li key={i} className="text-sm text-neutral-400">· {b}</li>
                ))}
              </ul>
            </div>
          </div>
        </ConfigSection>
      )}

      {/* Phrase Bank */}
      {phrases && (
        <ConfigSection title="Phrase Bank" version={phrases.version} status={phrases.status}>
          <div className="space-y-4">
            {(['openers', 'attacks', 'rebuttals', 'concessions', 'closers', 'audience_callouts'] as const).map(
              (category) => {
                const items = phrases[category]
                if (!items || items.length === 0) return null
                return (
                  <div key={category}>
                    <h4 className="mb-1 text-xs font-medium uppercase text-neutral-500">
                      {category.replace(/_/g, ' ')}
                    </h4>
                    <ul className="space-y-1">
                      {items.map((p, i) => (
                        <li key={i} className="text-sm text-neutral-300 italic">
                          &ldquo;{p}&rdquo;
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              },
            )}
          </div>
        </ConfigSection>
      )}

      {/* Epistemic Profile */}
      {epistemic && (
        <ConfigSection title="Epistemic Profile" version={epistemic.version} status={epistemic.status}>
          <div className="space-y-4">
            <DataList
              items={[
                {
                  label: 'Claim Tier Tendency',
                  value: (
                    <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">
                      {epistemic.default_claim_tier_tendency.replace(/_/g, ' ')}
                    </span>
                  ),
                },
                { label: 'Source Threshold', value: epistemic.source_quality_threshold },
              ]}
            />

            <MeterBar label="Speculation Tolerance" value={epistemic.speculation_tolerance} />

            <div>
              <h4 className="mb-2 text-xs font-medium uppercase text-neutral-500">Evidence Preferences</h4>
              <ul className="space-y-1">
                {epistemic.evidence_preferences.map((p, i) => (
                  <li key={i} className="text-sm text-neutral-400">· {p}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-medium uppercase text-neutral-500">Epistemic Red Lines</h4>
              <TagList tags={epistemic.epistemic_red_lines} color="red" />
            </div>

            {epistemic.high_risk_caution_topics.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase text-neutral-500">
                  High-Risk Caution Topics
                </h4>
                <TagList tags={epistemic.high_risk_caution_topics} color="amber" />
              </div>
            )}
          </div>
        </ConfigSection>
      )}

      {/* Relationships */}
      {relationships.length > 0 && (
        <ConfigSection title="Relationships" defaultOpen>
          <div className="space-y-3">
            {relationships.map((rel) => {
              const target = agentMap[rel.target_agent_id]
              if (!target) return null
              const targetColors = getArchetypeColor(target.archetype)
              return (
                <div
                  key={rel.id}
                  className={`rounded-lg border ${targetColors.border} p-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{target.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${targetColors.badge}`}>
                        {target.archetype.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                      {rel.relationship_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <MeterBar label="Respect" value={rel.respect_score} />
                    <MeterBar label="Distrust" value={rel.distrust_score} />
                    <MeterBar label="Rivalry" value={rel.rivalry_score} />
                  </div>
                  {rel.attack_angles.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-neutral-500">Attack angles: </span>
                      <span className="text-xs text-neutral-400">
                        {rel.attack_angles.join(' · ')}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ConfigSection>
      )}
    </div>
  )
}
