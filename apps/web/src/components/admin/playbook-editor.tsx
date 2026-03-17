'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Types (mirrored from debate-conductor — kept local to avoid cross-package import) ──

export type SpeakerSlot = 'moderator' | 'agent_a' | 'agent_b'

interface SingleTurn {
  id: string
  type?: 'single'
  speaker: SpeakerSlot
  label: string
}

interface RoundRobinTurn {
  id: string
  type: 'round_robin'
  speakers: SpeakerSlot[]
  rounds: number
  label: string
}

type PlaybookTurn = SingleTurn | RoundRobinTurn

export interface TurnConfig {
  turns: PlaybookTurn[]
}

// ── Speaker display helpers ───────────────────────────────────────────────────

const SLOT_LABELS: Record<SpeakerSlot, string> = {
  moderator: 'Moderator',
  agent_a: 'Agent A',
  agent_b: 'Agent B',
}

const SLOT_COLORS: Record<SpeakerSlot, string> = {
  moderator: 'bg-blue-900 text-blue-200',
  agent_a:   'bg-amber-900 text-amber-200',
  agent_b:   'bg-emerald-900 text-emerald-200',
}

/** Replace agent_a/agent_b slot labels with real participant names when available */
function resolveSlotLabel(
  slot: SpeakerSlot,
  agentAName: string,
  agentBName: string,
): string {
  if (slot === 'agent_a') return agentAName
  if (slot === 'agent_b') return agentBName
  return SLOT_LABELS.moderator
}

// ── Default playbook (matches conductor DEFAULT_TURN_CONFIG) ──────────────────

const DEFAULT_TURN_CONFIG: TurnConfig = {
  turns: [
    { id: 't1',  speaker: 'moderator', label: 'Introduction' },
    { id: 't2',  speaker: 'agent_a',   label: 'Opening Statement' },
    { id: 't3',  speaker: 'moderator', label: 'Transition to B' },
    { id: 't4',  speaker: 'agent_b',   label: 'Opening Statement' },
    { id: 't5',  speaker: 'moderator', label: 'Opens Discussion' },
    { id: 't6',  type: 'round_robin',  speakers: ['agent_a', 'agent_b'], rounds: 3, label: 'Open Discussion' },
    { id: 't7',  speaker: 'moderator', label: 'Discussion Summary' },
    { id: 't8',  speaker: 'moderator', label: 'Announce Closings' },
    { id: 't9',  speaker: 'agent_a',   label: 'Closing Argument' },
    { id: 't10', speaker: 'moderator', label: 'Bridge to B' },
    { id: 't11', speaker: 'agent_b',   label: 'Closing Argument' },
    { id: 't12', speaker: 'moderator', label: 'Final Address' },
  ],
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface PlaybookEditorProps {
  debateId: string
  debateStatus: string
  /** The debate-level turn_config override, if set */
  debateTurnConfig: TurnConfig | null
  /** The format-level turn_config, if set */
  formatTurnConfig: TurnConfig | null
  /** Actual participant names in speaking_order order: [first, second] */
  agentAName: string
  agentBName: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlaybookEditor({
  debateId,
  debateStatus,
  debateTurnConfig,
  formatTurnConfig,
  agentAName,
  agentBName,
}: PlaybookEditorProps) {
  const router = useRouter()
  const canEdit = debateStatus === 'draft' || debateStatus === 'scheduled'

  // The active config the conductor would use: debate → format → hardcoded default
  const activeSource: 'debate' | 'format' | 'default' = debateTurnConfig
    ? 'debate'
    : formatTurnConfig
      ? 'format'
      : 'default'

  const baseConfig = debateTurnConfig ?? formatTurnConfig ?? DEFAULT_TURN_CONFIG

  // Local working copy — edits are staged here before saving
  const [config, setConfig] = useState<TurnConfig>(baseConfig)
  const [swapped, setSwapped] = useState(false)  // tracks agent_a↔agent_b swap
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  function markDirty(next: TurnConfig) {
    setConfig(next)
    setDirty(true)
  }

  // ── Swap agent_a / agent_b across the entire playbook ────────────────────
  function handleSwap() {
    const next: TurnConfig = {
      turns: config.turns.map((turn) => {
        if (turn.type === 'round_robin') {
          return {
            ...turn,
            speakers: turn.speakers.map((s) =>
              s === 'agent_a' ? 'agent_b' : s === 'agent_b' ? 'agent_a' : s,
            ) as SpeakerSlot[],
          }
        }
        const s = turn.speaker
        return {
          ...turn,
          speaker: s === 'agent_a' ? 'agent_b' : s === 'agent_b' ? 'agent_a' : s,
        }
      }),
    }
    setSwapped((v) => !v)
    markDirty(next)
  }

  // ── Change discussion rounds ──────────────────────────────────────────────
  function setRounds(turnId: string, delta: number) {
    const next: TurnConfig = {
      turns: config.turns.map((turn) => {
        if (turn.id !== turnId || turn.type !== 'round_robin') return turn
        return { ...turn, rounds: Math.max(1, Math.min(10, turn.rounds + delta)) }
      }),
    }
    markDirty(next)
  }

  // ── Remove a single turn ──────────────────────────────────────────────────
  function removeTurn(turnId: string) {
    markDirty({ turns: config.turns.filter((t) => t.id !== turnId) })
  }

  // ── Add a single moderator turn ───────────────────────────────────────────
  function addModeratorTurn() {
    const id = `t${Date.now()}`
    markDirty({
      turns: [...config.turns, { id, speaker: 'moderator', label: 'Moderator Turn' }],
    })
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/admin/debates/${debateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnConfig: config }),
    })
    setSaving(false)
    if (res.ok) {
      setDirty(false)
      router.refresh()
    }
  }

  // ── Reset to format/default ───────────────────────────────────────────────
  async function handleReset() {
    setSaving(true)
    const res = await fetch(`/api/admin/debates/${debateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnConfig: null }),
    })
    setSaving(false)
    if (res.ok) {
      setConfig(formatTurnConfig ?? DEFAULT_TURN_CONFIG)
      setDirty(false)
      setSwapped(false)
      router.refresh()
    }
  }

  // ── Flat preview — expand round_robin for display ─────────────────────────
  function flattenForPreview(): Array<{ key: string; speaker: SpeakerSlot; label: string; turnId: string; isRRItem: boolean; rrId?: string; rrRounds?: number; rrIndex?: number }> {
    const rows: ReturnType<typeof flattenForPreview> = []
    for (const turn of config.turns) {
      if (turn.type === 'round_robin') {
        for (let r = 0; r < turn.rounds; r++) {
          for (const slot of turn.speakers) {
            rows.push({
              key: `${turn.id}-r${r}-${slot}`,
              speaker: slot,
              label: `${turn.label} — Round ${r + 1}`,
              turnId: turn.id,
              isRRItem: true,
              rrId: turn.id,
              rrRounds: turn.rounds,
              rrIndex: r,
            })
          }
        }
      } else {
        rows.push({
          key: turn.id,
          speaker: turn.speaker,
          label: turn.label,
          turnId: turn.id,
          isRRItem: false,
        })
      }
    }
    return rows
  }

  const rows = flattenForPreview()

  // Track which round_robin IDs we've already rendered controls for
  const renderedRRControls = new Set<string>()

  return (
    <div className="space-y-4">

      {/* Source + swap controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>Source:</span>
          <span className={`rounded px-1.5 py-0.5 ${
            activeSource === 'debate'  ? 'bg-amber-900/50 text-amber-300' :
            activeSource === 'format'  ? 'bg-blue-900/50 text-blue-300' :
                                         'bg-neutral-800 text-neutral-400'
          }`}>
            {activeSource === 'debate'  ? 'Debate override' :
             activeSource === 'format'  ? 'Format default' :
                                          'System default'}
          </span>
          {dirty && <span className="text-amber-400">• Unsaved changes</span>}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSwap}
              className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:border-neutral-500 hover:text-white transition"
              title="Swap which debater goes first"
            >
              {swapped ? '↕ Swapped' : '↕ Swap A↔B'}
            </button>
          </div>
        )}
      </div>

      {/* Turn list */}
      <div className="space-y-1">
        {rows.map((row, i) => {
          const isFirstRRRow = row.isRRItem && !renderedRRControls.has(row.rrId!)
          if (row.isRRItem) renderedRRControls.add(row.rrId!)
          const rrTurn = row.isRRItem
            ? (config.turns.find((t) => t.id === row.rrId) as RoundRobinTurn | undefined)
            : undefined

          return (
            <div
              key={row.key}
              className={`flex items-center gap-3 rounded px-3 py-2 text-sm ${
                row.isRRItem ? 'bg-neutral-900/60' : 'bg-neutral-900/30'
              }`}
            >
              {/* Index */}
              <span className="w-6 shrink-0 text-right text-xs text-neutral-600">{i + 1}</span>

              {/* Speaker badge */}
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${SLOT_COLORS[row.speaker]}`}>
                {resolveSlotLabel(row.speaker, agentAName, agentBName)}
              </span>

              {/* Label */}
              <span className="flex-1 text-neutral-300">{row.label}</span>

              {/* Round-robin controls — only on first row of each RR block */}
              {row.isRRItem && isFirstRRRow && rrTurn && canEdit && (
                <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <span>Rounds:</span>
                  <button
                    onClick={() => setRounds(row.rrId!, -1)}
                    disabled={rrTurn.rounds <= 1}
                    className="rounded bg-neutral-800 px-1.5 py-0.5 hover:bg-neutral-700 disabled:opacity-30 transition"
                  >
                    −
                  </button>
                  <span className="w-4 text-center text-white">{rrTurn.rounds}</span>
                  <button
                    onClick={() => setRounds(row.rrId!, 1)}
                    disabled={rrTurn.rounds >= 10}
                    className="rounded bg-neutral-800 px-1.5 py-0.5 hover:bg-neutral-700 disabled:opacity-30 transition"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Remove — only on non-RR single turns */}
              {!row.isRRItem && canEdit && (
                <button
                  onClick={() => removeTurn(row.turnId)}
                  className="shrink-0 text-neutral-600 hover:text-red-400 transition"
                  title="Remove turn"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Add + Save + Reset */}
      {canEdit && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={addModeratorTurn}
            className="rounded border border-neutral-700 px-2.5 py-1 text-xs text-neutral-400 hover:border-neutral-500 hover:text-white transition"
          >
            + Add moderator turn
          </button>

          <div className="flex-1" />

          {activeSource === 'debate' && (
            <button
              onClick={handleReset}
              disabled={saving}
              className="rounded px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-300 disabled:opacity-50 transition"
            >
              Reset to {formatTurnConfig ? 'format' : 'system'} default
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="rounded bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20 disabled:opacity-40 transition"
          >
            {saving ? 'Saving…' : 'Save playbook'}
          </button>
        </div>
      )}

      {!canEdit && (
        <p className="text-xs text-neutral-600">
          Playbook is locked while the debate is {debateStatus}.
        </p>
      )}
    </div>
  )
}
