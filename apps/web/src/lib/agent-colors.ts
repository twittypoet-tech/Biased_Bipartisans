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

export const expertiseColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  'Environmental Science': { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/50', badge: 'bg-emerald-900/60 text-emerald-200' },
  'History & Politics': { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/50', badge: 'bg-blue-900/60 text-blue-200' },
  'Law & Jurisprudence': { bg: 'bg-indigo-950/40', text: 'text-indigo-400', border: 'border-indigo-800/50', badge: 'bg-indigo-900/60 text-indigo-200' },
  'Medicine & Healthcare': { bg: 'bg-teal-950/40', text: 'text-teal-400', border: 'border-teal-800/50', badge: 'bg-teal-900/60 text-teal-200' },
  'Philosophy & Ethics': { bg: 'bg-violet-950/40', text: 'text-violet-400', border: 'border-violet-800/50', badge: 'bg-violet-900/60 text-violet-200' },
  'Rhetoric & Persuasion': { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/50', badge: 'bg-amber-900/60 text-amber-200' },
  'Statistics & Data Science': { bg: 'bg-cyan-950/40', text: 'text-cyan-400', border: 'border-cyan-800/50', badge: 'bg-cyan-900/60 text-cyan-200' },
  'Technology & Innovation': { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800/50', badge: 'bg-purple-900/60 text-purple-200' },
}

const defaultExpertiseColors = { bg: 'bg-neutral-900/40', text: 'text-neutral-400', border: 'border-neutral-700/50', badge: 'bg-neutral-800 text-neutral-400' }

export function getExpertiseColor(domain: string): { bg: string; text: string; border: string; badge: string } {
  return expertiseColors[domain] ?? defaultExpertiseColors
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
