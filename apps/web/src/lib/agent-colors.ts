/** Accent colors per agent archetype for UI consistency */
export const archetypeColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  hawk: { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-800/50', badge: 'bg-red-900 text-red-200' },
  dove: { bg: 'bg-sky-950/40', text: 'text-sky-400', border: 'border-sky-800/50', badge: 'bg-sky-900 text-sky-200' },
  technocrat: { bg: 'bg-violet-950/40', text: 'text-violet-400', border: 'border-violet-800/50', badge: 'bg-violet-900 text-violet-200' },
  populist: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/50', badge: 'bg-amber-900 text-amber-200' },
  cynic: { bg: 'bg-zinc-800/40', text: 'text-zinc-400', border: 'border-zinc-700/50', badge: 'bg-zinc-800 text-zinc-200' },
  conspiracy_theorist: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/50', badge: 'bg-emerald-900 text-emerald-200' },
  institutionalist: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/50', badge: 'bg-blue-900 text-blue-200' },
  libertarian: { bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-800/50', badge: 'bg-orange-900 text-orange-200' },
}

const defaultColors = { bg: 'bg-zinc-800/40', text: 'text-zinc-400', border: 'border-zinc-700/50', badge: 'bg-zinc-800 text-zinc-200' }

export function getArchetypeColor(archetype: string): { bg: string; text: string; border: string; badge: string } {
  return archetypeColors[archetype] ?? defaultColors
}

export const statusColors: Record<string, string> = {
  official: 'bg-emerald-900 text-emerald-200',
  guest: 'bg-blue-900 text-blue-200',
  sandbox: 'bg-yellow-900 text-yellow-200',
  draft: 'bg-zinc-700 text-zinc-300',
  active: 'bg-emerald-900 text-emerald-200',
  archived: 'bg-zinc-800 text-zinc-400',
  scheduled: 'bg-blue-900 text-blue-200',
  live: 'bg-red-900 text-red-200',
  ended: 'bg-zinc-700 text-zinc-300',
  cancelled: 'bg-zinc-800 text-zinc-500',
}
