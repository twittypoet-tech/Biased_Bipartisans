export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import {
  getAgentBySlug,
  getActiveWorldview,
  getActiveStyleProfile,
  getActivePhraseBank,
  getActiveEpistemicProfile,
  getAgentRelationships,
  getEvalRunsForAgent,
} from '@bipi/db'
import { getArchetypeColor } from '@/lib/agent-colors'
import { AgentIntroPlayer } from '@/components/public/agent-intro-player'
import { CompositeScoreBadge } from '@/components/public/score-display'
import Link from 'next/link'

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
      <div className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Agent not found</h1>
        <Link href="/agents" className="mt-4 inline-block text-sm text-neutral-400 hover:text-white transition">
          Back to agents
        </Link>
      </div>
    )
  }

  const [worldview, style, phrases, epistemic, relationships, evalRuns] = await Promise.all([
    getActiveWorldview(db, agent.id),
    getActiveStyleProfile(db, agent.id),
    getActivePhraseBank(db, agent.id),
    getActiveEpistemicProfile(db, agent.id),
    getAgentRelationships(db, agent.id),
    getEvalRunsForAgent(db, agent.id, 10),
  ])

  // Fetch debate metadata for eval runs
  const debateIds = [...new Set(evalRuns.map((r) => r.debate_id))]
  const { data: relatedDebates } = debateIds.length > 0
    ? await db.from('debates').select('id, title, slug, ended_at').in('id', debateIds)
    : { data: [] as Array<{ id: string; title: string; slug: string; ended_at: string | null }> }
  const debateMap = new Map((relatedDebates ?? []).map((d) => [d.id, d]))

  // Compute average composite score
  const scoredRuns = evalRuns.filter((r) => r.composite_score != null)
  const avgComposite = scoredRuns.length > 0
    ? scoredRuns.reduce((sum, r) => sum + (r.composite_score ?? 0), 0) / scoredRuns.length
    : null

  const colors = getArchetypeColor(agent.archetype)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg} p-8`}>
        {/* Background glow */}
        <div className={`pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-20 blur-3xl ${colors.bg}`} />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${colors.badge}`}>
                {archetypeLabels[agent.archetype] ?? agent.archetype}
              </span>
              <span className="rounded-full border border-neutral-700/50 bg-neutral-900/40 px-2.5 py-0.5 text-[10px] text-neutral-500 uppercase tracking-wider">
                {agent.evolution_stage.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className={`mt-3 text-4xl font-bold tracking-tight ${colors.text}`}>{agent.name}</h1>
            {agent.short_bio && (
              <p className="mt-2 max-w-lg text-neutral-300 leading-relaxed">{agent.short_bio}</p>
            )}

            {/* Intro player */}
            <div className="mt-4">
              <AgentIntroPlayer
                agentId={agent.id}
                agentName={agent.name}
                initialAudioUrl={agent.intro_audio_url ?? null}
              />
            </div>
          </div>

          <div className="shrink-0 text-right text-xs text-neutral-600 space-y-1">
            <div>Powered by {agent.llm_provider === 'anthropic' ? 'Claude' : 'GPT-4o'}</div>
            <div className="font-mono text-[10px] text-neutral-700">{agent.llm_model}</div>
          </div>
        </div>
      </div>

      {/* ── Main Grid ────────────────────────────────────────────────────── */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">

        {/* Left column */}
        <div className="space-y-6">

          {/* Worldview */}
          {worldview && (
            <section>
              <SectionHeading>Worldview</SectionHeading>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-5">
                <div>
                  <Label>Core Thesis</Label>
                  <p className="mt-1 text-neutral-200 leading-relaxed">{worldview.core_thesis}</p>
                </div>
                {worldview.values && worldview.values.length > 0 && (
                  <div>
                    <Label>Values</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {worldview.values.map((v: string, i: number) => (
                        <span key={i} className={`rounded-full px-3 py-1 text-xs font-medium ${colors.badge}`}>
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {worldview.doctrine && worldview.doctrine.length > 0 && (
                  <div>
                    <Label>Doctrine</Label>
                    <ul className="mt-2 space-y-1.5 text-sm text-neutral-300">
                      {worldview.doctrine.map((d: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5 shrink-0 text-neutral-600">▸</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {worldview.red_lines && worldview.red_lines.length > 0 && (
                  <div>
                    <Label className="text-red-400/80">Red Lines</Label>
                    <ul className="mt-2 space-y-1.5 text-sm text-neutral-400">
                      {worldview.red_lines.map((r: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-0.5 shrink-0 text-red-800">▸</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Signature Phrases */}
          {phrases && (phrases.openers?.length > 0 || phrases.attacks?.length > 0 || phrases.closers?.length > 0) && (
            <section>
              <SectionHeading>How They Speak</SectionHeading>
              <div className="space-y-4">
                {phrases.openers && phrases.openers.length > 0 && (
                  <PhraseCard label="Openers" phrases={phrases.openers} color={colors.text} />
                )}
                {phrases.attacks && phrases.attacks.length > 0 && (
                  <PhraseCard label="Attack Lines" phrases={phrases.attacks} color="text-neutral-300" />
                )}
                {phrases.closers && phrases.closers.length > 0 && (
                  <PhraseCard label="Closers" phrases={phrases.closers} color="text-neutral-300" />
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right column — style cards */}
        <div className="space-y-4">

          {/* Voice & Tone */}
          {style && (
            <>
              <MiniCard title="Voice & Tone">
                <StatRow label="Temperament" value={style.temperament.replace(/_/g, ' ')} capitalize />
                <StatRow label="Tone" value={style.tone} />
                <StatRow label="Pace" value={style.pace} />
                <StatRow label="Sentence Style" value={style.sentence_style} />
              </MiniCard>

              {/* Rhetorical Arsenal */}
              {((style.rhetorical_os && style.rhetorical_os.length > 0) ||
                (style.rhetorical_devices && style.rhetorical_devices.length > 0) ||
                (style.signature_behaviors && style.signature_behaviors.length > 0)) && (
                <MiniCard title="Rhetorical Arsenal">
                  {style.rhetorical_os && style.rhetorical_os.length > 0 && (
                    <div>
                      <Label className="mb-1.5">Operating System</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {style.rhetorical_os.map((r: string, i: number) => (
                          <span key={i} className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[11px] text-neutral-300">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {style.rhetorical_devices && style.rhetorical_devices.length > 0 && (
                    <div className="mt-3">
                      <Label className="mb-1.5">Devices</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {style.rhetorical_devices.map((d: string, i: number) => (
                          <span key={i} className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[11px] text-neutral-400">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {style.signature_behaviors && style.signature_behaviors.length > 0 && (
                    <div className="mt-3">
                      <Label className="mb-1.5">Signature Behaviors</Label>
                      <ul className="space-y-1 text-xs text-neutral-400">
                        {style.signature_behaviors.map((b: string, i: number) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-neutral-700 shrink-0">▸</span>{b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </MiniCard>
              )}
            </>
          )}

          {/* Epistemic Profile */}
          {epistemic && (
            <MiniCard title="Epistemic Profile">
              <StatRow
                label="Claim tendency"
                value={epistemic.default_claim_tier_tendency.replace(/_/g, ' ')}
                capitalize
              />
              <StatRow
                label="Speculation tolerance"
                value={`${Math.round(epistemic.speculation_tolerance * 100)}%`}
              />
              {epistemic.source_quality_threshold && (
                <StatRow label="Source threshold" value={epistemic.source_quality_threshold} capitalize />
              )}
              {epistemic.evidence_preferences && epistemic.evidence_preferences.length > 0 && (
                <div className="mt-3">
                  <Label className="mb-1.5">Evidence preferences</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {epistemic.evidence_preferences.map((e: string, i: number) => (
                      <span key={i} className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[11px] text-neutral-400">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {epistemic.epistemic_red_lines && epistemic.epistemic_red_lines.length > 0 && (
                <div className="mt-3">
                  <Label className="mb-1.5 text-red-400/70">Hard Limits</Label>
                  <ul className="space-y-1 text-xs text-neutral-500">
                    {epistemic.epistemic_red_lines.map((r: string, i: number) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-red-900 shrink-0">▸</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </MiniCard>
          )}

          {/* Meter bars */}
          {style && (
            <MiniCard title="Personality Dials">
              <MeterRow label="Humor" value={style.humor_level} />
              <MeterRow label="Certainty" value={style.certainty_level} />
              <MeterRow label="Warmth" value={style.warmth} />
              <MeterRow label="Abstraction" value={style.abstraction_level} />
              <MeterRow label="Interruption" value={style.interruption_tendency} />
            </MiniCard>
          )}

          {/* Performance */}
          {scoredRuns.length > 0 && (
            <MiniCard title="Performance">
              {avgComposite !== null && (
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-neutral-800">
                  <span className="text-xs text-neutral-500">Avg Score</span>
                  <CompositeScoreBadge score={avgComposite} size="md" />
                </div>
              )}
              <div className="space-y-2">
                {scoredRuns.slice(0, 5).map((run) => {
                  const debate = debateMap.get(run.debate_id)
                  return (
                    <div key={run.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {debate?.slug ? (
                          <Link
                            href={`/debates/${debate.slug}`}
                            className="text-xs text-neutral-300 hover:text-white transition truncate block"
                          >
                            {debate?.title ?? 'Unknown'}
                          </Link>
                        ) : (
                          <span className="text-xs text-neutral-400 truncate block">
                            {debate?.title ?? 'Unknown'}
                          </span>
                        )}
                        {debate?.ended_at && (
                          <span className="text-[10px] text-neutral-600">
                            {new Date(debate.ended_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <CompositeScoreBadge score={run.composite_score ?? null} />
                    </div>
                  )
                })}
              </div>
            </MiniCard>
          )}
        </div>
      </div>

      {/* ── Rivalries ────────────────────────────────────────────────────── */}
      {relationships && relationships.length > 0 && (
        <section className="mt-8">
          <SectionHeading>Rivalries & Alliances</SectionHeading>
          <div className="grid gap-3 sm:grid-cols-2">
            {relationships.map((rel) => {
              const relColors = getArchetypeColor(
                (rel as unknown as Record<string, string>).target_archetype ?? '',
              )
              return (
                <div
                  key={rel.id}
                  className={`rounded-xl border ${relColors.border} ${relColors.bg} p-4`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold capitalize ${relColors.text}`}>
                      {rel.relationship_type.replace(/_/g, ' ')}
                    </span>
                    <div className="flex gap-3 text-[10px] text-neutral-500">
                      <span>R {Math.round(rel.respect_score * 100)}%</span>
                      <span>Rival {Math.round(rel.rivalry_score * 100)}%</span>
                    </div>
                  </div>
                  {rel.attack_angles && rel.attack_angles.length > 0 && (
                    <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
                      {rel.attack_angles.join(' · ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Small reusable layout components ────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
      {children}
    </h2>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-medium uppercase tracking-wider text-neutral-500 ${className ?? ''}`}>
      {children}
    </p>
  )
}

function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function StatRow({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-neutral-500 shrink-0">{label}</span>
      <span className={`text-xs text-neutral-200 text-right ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function MeterRow({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-neutral-500">{label}</span>
        <span className="text-neutral-500">{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-neutral-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function PhraseCard({
  label,
  phrases,
  color,
}: {
  label: string
  phrases: string[]
  color: string
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <Label className="mb-3">{label}</Label>
      <div className="space-y-2">
        {phrases.map((p: string, i: number) => (
          <p key={i} className={`text-sm italic ${color} leading-relaxed`}>
            &ldquo;{p}&rdquo;
          </p>
        ))}
      </div>
    </div>
  )
}
