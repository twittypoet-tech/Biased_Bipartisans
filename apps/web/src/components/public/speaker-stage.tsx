'use client'

import { getArchetypeColor } from '@/lib/agent-colors'
import { AudioWaveform } from './audio-waveform'

export interface StageParticipant {
  id: string
  name: string
  archetype: string
  role: 'debater' | 'moderator'
}

interface SpeakerStageProps {
  participants: StageParticipant[]
  activeSpeakerId: string | null
  currentPhase: string | null
}

const phaseLabels: Record<string, string> = {
  opening: 'Opening Statements',
  rebuttal: 'Rebuttals',
  pressure: 'Pressure Round',
  audience_evidence: 'Audience & Evidence',
  closing: 'Closing Arguments',
}

export function SpeakerStage({ participants, activeSpeakerId, currentPhase }: SpeakerStageProps) {
  const debaters = participants.filter((p) => p.role === 'debater')
  const moderator = participants.find((p) => p.role === 'moderator')

  return (
    <div className="relative rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900/80 to-neutral-950/90 p-6 overflow-hidden">
      {/* Ambient glow from active speaker */}
      {activeSpeakerId && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-700"
          style={{
            background: `radial-gradient(ellipse at center, ${getSpeakerGlowColor(
              participants.find((p) => p.id === activeSpeakerId)?.archetype
            )} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Phase indicator */}
      {currentPhase && (
        <div className="mb-5 flex items-center justify-center gap-2">
          <div className="h-px flex-1 bg-neutral-800" />
          <span className="rounded-full border border-neutral-700/60 bg-neutral-900 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-neutral-400">
            {phaseLabels[currentPhase] ?? currentPhase}
          </span>
          <div className="h-px flex-1 bg-neutral-800" />
        </div>
      )}

      {/* Debater podiums */}
      <div className="flex items-stretch justify-center gap-4">
        {debaters.map((participant) => {
          const isSpeaking = activeSpeakerId === participant.id
          const colors = getArchetypeColor(participant.archetype)

          return (
            <div
              key={participant.id}
              className={`relative flex-1 max-w-[280px] rounded-lg border-2 p-4 transition-all duration-500 ${
                isSpeaking
                  ? `${colors.border} ${colors.bg} shadow-lg scale-[1.03]`
                  : 'border-neutral-800/50 bg-neutral-900/30 opacity-60'
              }`}
            >
              {/* Speaking glow ring */}
              {isSpeaking && (
                <div className="absolute -inset-px rounded-lg border-2 border-current opacity-40 animate-pulse" style={{ borderColor: 'inherit' }} />
              )}

              <div className="flex flex-col items-center gap-2 text-center">
                {/* Avatar circle */}
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold transition-all duration-500 ${
                    isSpeaking ? `${colors.badge} ring-2 ring-white/20` : 'bg-neutral-800 text-neutral-500'
                  }`}
                >
                  {participant.name.charAt(0)}
                </div>

                {/* Name + archetype */}
                <div>
                  <p className={`text-sm font-semibold transition-colors duration-300 ${isSpeaking ? colors.text : 'text-neutral-500'}`}>
                    {participant.name}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-600">
                    {participant.archetype.replace('_', ' ')}
                  </p>
                </div>

                {/* Waveform */}
                <AudioWaveform
                  active={isSpeaking}
                  color={isSpeaking ? getWaveformColor(participant.archetype) : 'bg-neutral-700'}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Moderator bar */}
      {moderator && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-300 ${
              activeSpeakerId === moderator.id
                ? 'border-neutral-600 bg-neutral-800 text-neutral-200'
                : 'border-neutral-800/50 bg-neutral-900/30 text-neutral-600'
            }`}
          >
            <span className="text-xs font-medium">Moderator: {moderator.name}</span>
            {activeSpeakerId === moderator.id && (
              <AudioWaveform active barCount={3} color="bg-neutral-300" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Map archetype to a CSS-friendly glow color for the ambient background */
function getSpeakerGlowColor(archetype?: string): string {
  const glows: Record<string, string> = {
    hawk: '#dc2626',
    dove: '#0ea5e9',
    technocrat: '#8b5cf6',
    populist: '#f59e0b',
    cynic: '#71717a',
    conspiracy_theorist: '#10b981',
    institutionalist: '#3b82f6',
    libertarian: '#f97316',
  }
  return glows[archetype ?? ''] ?? '#71717a'
}

/** Map archetype to a Tailwind bg color class for waveform bars */
function getWaveformColor(archetype: string): string {
  const colors: Record<string, string> = {
    hawk: 'bg-red-400',
    dove: 'bg-sky-400',
    technocrat: 'bg-violet-400',
    populist: 'bg-amber-400',
    cynic: 'bg-zinc-400',
    conspiracy_theorist: 'bg-emerald-400',
    institutionalist: 'bg-blue-400',
    libertarian: 'bg-orange-400',
  }
  return colors[archetype] ?? 'bg-neutral-400'
}
