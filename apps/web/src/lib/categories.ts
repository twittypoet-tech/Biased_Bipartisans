// ── Category metadata — single source of truth ─────────────────────────────

export interface CategoryMeta {
  label: string
  slug: string
}

/** All 20 valid categories, ordered for nav display (priority categories first) */
export const NAV_CATEGORIES: CategoryMeta[] = [
  { label: 'World Affairs', slug: 'world-affairs' },
  { label: 'Domestic Policy', slug: 'domestic-policy' },
  { label: 'Economy & Business', slug: 'economy-business' },
  { label: 'Tech & AI', slug: 'tech-ai' },
  { label: 'National Security & Defense', slug: 'national-security-defense' },
  { label: 'Science & Space', slug: 'science-space' },
  { label: 'Criminal Justice', slug: 'criminal-justice' },
  { label: 'Immigration', slug: 'immigration' },
  { label: 'Social Issues', slug: 'social-issues' },
  { label: 'Energy & Climate', slug: 'energy-climate' },
  { label: 'History & Politics', slug: 'history-politics' },
  { label: 'Law & Jurisprudence', slug: 'law-jurisprudence' },
  { label: 'Medicine & Healthcare', slug: 'medicine-healthcare' },
  { label: 'Education & Culture', slug: 'education-culture' },
  { label: 'Infrastructure & Housing', slug: 'infrastructure-housing' },
  { label: 'Environmental Science', slug: 'environmental-science' },
  { label: 'Philosophy & Ethics', slug: 'philosophy-ethics' },
  { label: 'Technology & Innovation', slug: 'technology-innovation' },
  { label: 'Rhetoric & Persuasion', slug: 'rhetoric-persuasion' },
  { label: 'Statistics & Data Science', slug: 'statistics-data-science' },
]

/** Map slug → canonical DB category name */
const SLUG_TO_LABEL = new Map(NAV_CATEGORIES.map((c) => [c.slug, c.label]))
const LABEL_TO_SLUG = new Map(NAV_CATEGORIES.map((c) => [c.label, c.slug]))

export function slugifyCategory(label: string): string {
  return LABEL_TO_SLUG.get(label) ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function deslugifyCategory(slug: string): string | null {
  return SLUG_TO_LABEL.get(slug) ?? null
}

/** Category banner colors — used in nav, cards, article pages */
export const CATEGORY_BANNER: Record<string, string> = {
  'Environmental Science':      'bg-green-950/80 text-green-300',
  'History & Politics':         'bg-red-950/80 text-red-300',
  'Law & Jurisprudence':        'bg-blue-950/80 text-blue-300',
  'Medicine & Healthcare':      'bg-pink-950/80 text-pink-300',
  'Philosophy & Ethics':        'bg-purple-950/80 text-purple-300',
  'Rhetoric & Persuasion':      'bg-orange-950/80 text-orange-300',
  'Statistics & Data Science':   'bg-cyan-950/80 text-cyan-300',
  'Technology & Innovation':    'bg-amber-950/80 text-amber-300',
  'Economy & Business':         'bg-emerald-950/80 text-emerald-300',
  'National Security & Defense': 'bg-red-950/80 text-red-300',
  'Education & Culture':        'bg-violet-950/80 text-violet-300',
  'Energy & Climate':           'bg-lime-950/80 text-lime-300',
  'Science & Space':            'bg-sky-950/80 text-sky-300',
  'Criminal Justice':           'bg-rose-950/80 text-rose-300',
  'Immigration':                'bg-teal-950/80 text-teal-300',
  'Infrastructure & Housing':   'bg-stone-800/80 text-stone-300',
  'World Affairs':              'bg-indigo-950/80 text-indigo-300',
  'Domestic Policy':            'bg-fuchsia-950/80 text-fuchsia-300',
  'Tech & AI':                  'bg-cyan-950/80 text-cyan-300',
  'Social Issues':              'bg-pink-950/80 text-pink-300',
}

/** Category accent colors for badges/pills */
export const CATEGORY_COLORS: Record<string, string> = {
  'Environmental Science':      'bg-green-950/60 text-green-400 border-green-800/40',
  'History & Politics':         'bg-red-950/60 text-red-400 border-red-800/40',
  'Law & Jurisprudence':        'bg-blue-950/60 text-blue-400 border-blue-800/40',
  'Medicine & Healthcare':      'bg-pink-950/60 text-pink-400 border-pink-800/40',
  'Philosophy & Ethics':        'bg-purple-950/60 text-purple-400 border-purple-800/40',
  'Rhetoric & Persuasion':      'bg-orange-950/60 text-orange-400 border-orange-800/40',
  'Statistics & Data Science':   'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
  'Technology & Innovation':    'bg-amber-950/60 text-amber-400 border-amber-800/40',
  'Economy & Business':         'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
  'National Security & Defense': 'bg-red-950/60 text-red-400 border-red-800/40',
  'Education & Culture':        'bg-violet-950/60 text-violet-400 border-violet-800/40',
  'Energy & Climate':           'bg-lime-950/60 text-lime-400 border-lime-800/40',
  'Science & Space':            'bg-sky-950/60 text-sky-400 border-sky-800/40',
  'Criminal Justice':           'bg-rose-950/60 text-rose-400 border-rose-800/40',
  'Immigration':                'bg-teal-950/60 text-teal-400 border-teal-800/40',
  'Infrastructure & Housing':   'bg-stone-800/60 text-stone-400 border-stone-600/40',
  'World Affairs':              'bg-indigo-950/60 text-indigo-400 border-indigo-800/40',
  'Domestic Policy':            'bg-fuchsia-950/60 text-fuchsia-400 border-fuchsia-800/40',
  'Tech & AI':                  'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
  'Social Issues':              'bg-pink-950/60 text-pink-400 border-pink-800/40',
}

/** Utility: format time ago */
export function formatAge(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}
