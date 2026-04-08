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

/** Category banner colors — solid bg, works in both modes */
export const CATEGORY_BANNER: Record<string, string> = {
  'Environmental Science':      'bg-green-900/80 text-green-100',
  'History & Politics':         'bg-red-900/80 text-red-100',
  'Law & Jurisprudence':        'bg-blue-900/80 text-blue-100',
  'Medicine & Healthcare':      'bg-pink-900/80 text-pink-100',
  'Philosophy & Ethics':        'bg-purple-900/80 text-purple-100',
  'Rhetoric & Persuasion':      'bg-orange-900/80 text-orange-100',
  'Statistics & Data Science':   'bg-cyan-900/80 text-cyan-100',
  'Technology & Innovation':    'bg-amber-900/80 text-amber-100',
  'Economy & Business':         'bg-emerald-900/80 text-emerald-100',
  'National Security & Defense': 'bg-red-900/80 text-red-100',
  'Education & Culture':        'bg-violet-900/80 text-violet-100',
  'Energy & Climate':           'bg-lime-900/80 text-lime-100',
  'Science & Space':            'bg-sky-900/80 text-sky-100',
  'Criminal Justice':           'bg-rose-900/80 text-rose-100',
  'Immigration':                'bg-teal-900/80 text-teal-100',
  'Infrastructure & Housing':   'bg-stone-700/80 text-stone-100',
  'World Affairs':              'bg-indigo-900/80 text-indigo-100',
  'Domestic Policy':            'bg-fuchsia-900/80 text-fuchsia-100',
  'Tech & AI':                  'bg-cyan-900/80 text-cyan-100',
  'Social Issues':              'bg-pink-900/80 text-pink-100',
}

/** Category accent colors for badges/pills — solid bg, works in both modes (same pattern as agent-colors.ts) */
export const CATEGORY_COLORS: Record<string, string> = {
  'Environmental Science':      'bg-green-900/60 text-green-200 border-green-700/50',
  'History & Politics':         'bg-red-900/60 text-red-200 border-red-700/50',
  'Law & Jurisprudence':        'bg-blue-900/60 text-blue-200 border-blue-700/50',
  'Medicine & Healthcare':      'bg-pink-900/60 text-pink-200 border-pink-700/50',
  'Philosophy & Ethics':        'bg-purple-900/60 text-purple-200 border-purple-700/50',
  'Rhetoric & Persuasion':      'bg-orange-900/60 text-orange-200 border-orange-700/50',
  'Statistics & Data Science':   'bg-cyan-900/60 text-cyan-200 border-cyan-700/50',
  'Technology & Innovation':    'bg-amber-900/60 text-amber-200 border-amber-700/50',
  'Economy & Business':         'bg-emerald-900/60 text-emerald-200 border-emerald-700/50',
  'National Security & Defense': 'bg-red-900/60 text-red-200 border-red-700/50',
  'Education & Culture':        'bg-violet-900/60 text-violet-200 border-violet-700/50',
  'Energy & Climate':           'bg-lime-900/60 text-lime-200 border-lime-700/50',
  'Science & Space':            'bg-sky-900/60 text-sky-200 border-sky-700/50',
  'Criminal Justice':           'bg-rose-900/60 text-rose-200 border-rose-700/50',
  'Immigration':                'bg-teal-900/60 text-teal-200 border-teal-700/50',
  'Infrastructure & Housing':   'bg-stone-700/60 text-stone-200 border-stone-600/50',
  'World Affairs':              'bg-indigo-900/60 text-indigo-200 border-indigo-700/50',
  'Domestic Policy':            'bg-fuchsia-900/60 text-fuchsia-200 border-fuchsia-700/50',
  'Tech & AI':                  'bg-cyan-900/60 text-cyan-200 border-cyan-700/50',
  'Social Issues':              'bg-pink-900/60 text-pink-200 border-pink-700/50',
}

/** Fallback image for broken/missing hero images */
export const FALLBACK_IMAGE_URL = 'https://ttmjfvfgvmmyvplhgkgk.supabase.co/storage/v1/object/public/news-report-images/fallback-og.png'

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
