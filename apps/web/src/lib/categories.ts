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

/** Category banner colors — used in nav, cards, article pages — light + dark mode safe */
export const CATEGORY_BANNER: Record<string, string> = {
  'Environmental Science':      'bg-green-100 text-green-900 dark:bg-green-950/80 dark:text-green-300',
  'History & Politics':         'bg-red-100 text-red-900 dark:bg-red-950/80 dark:text-red-300',
  'Law & Jurisprudence':        'bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300',
  'Medicine & Healthcare':      'bg-pink-100 text-pink-900 dark:bg-pink-950/80 dark:text-pink-300',
  'Philosophy & Ethics':        'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300',
  'Rhetoric & Persuasion':      'bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-300',
  'Statistics & Data Science':   'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300',
  'Technology & Innovation':    'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300',
  'Economy & Business':         'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300',
  'National Security & Defense': 'bg-red-100 text-red-900 dark:bg-red-950/80 dark:text-red-300',
  'Education & Culture':        'bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-300',
  'Energy & Climate':           'bg-lime-100 text-lime-900 dark:bg-lime-950/80 dark:text-lime-300',
  'Science & Space':            'bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-300',
  'Criminal Justice':           'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-300',
  'Immigration':                'bg-teal-100 text-teal-900 dark:bg-teal-950/80 dark:text-teal-300',
  'Infrastructure & Housing':   'bg-stone-200 text-stone-800 dark:bg-stone-800/80 dark:text-stone-300',
  'World Affairs':              'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-300',
  'Domestic Policy':            'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-950/80 dark:text-fuchsia-300',
  'Tech & AI':                  'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-300',
  'Social Issues':              'bg-pink-100 text-pink-900 dark:bg-pink-950/80 dark:text-pink-300',
}

/** Category accent colors for badges/pills — light + dark mode safe */
export const CATEGORY_COLORS: Record<string, string> = {
  'Environmental Science':      'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-400 dark:border-green-800/40',
  'History & Politics':         'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/40',
  'Law & Jurisprudence':        'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/40',
  'Medicine & Healthcare':      'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-400 dark:border-pink-800/40',
  'Philosophy & Ethics':        'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/40',
  'Rhetoric & Persuasion':      'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-400 dark:border-orange-800/40',
  'Statistics & Data Science':   'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800/40',
  'Technology & Innovation':    'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/40',
  'Economy & Business':         'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40',
  'National Security & Defense': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-400 dark:border-red-800/40',
  'Education & Culture':        'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-400 dark:border-violet-800/40',
  'Energy & Climate':           'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-950/60 dark:text-lime-400 dark:border-lime-800/40',
  'Science & Space':            'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/40',
  'Criminal Justice':           'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/40',
  'Immigration':                'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800/40',
  'Infrastructure & Housing':   'bg-stone-200 text-stone-700 border-stone-400 dark:bg-stone-800/60 dark:text-stone-400 dark:border-stone-600/40',
  'World Affairs':              'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800/40',
  'Domestic Policy':            'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-400 dark:border-fuchsia-800/40',
  'Tech & AI':                  'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800/40',
  'Social Issues':              'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-400 dark:border-pink-800/40',
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
