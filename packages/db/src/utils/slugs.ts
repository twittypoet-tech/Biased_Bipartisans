import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Given a base slug (already URL-normalised by generateDebateSlug), check
 * the debates table for conflicts and return a unique slug by appending -2,
 * -3, etc. as needed.
 *
 * Uses a single ILIKE prefix query to find all existing slugs that could
 * conflict, then increments the highest numeric suffix.
 */
export async function generateUniqueDebateSlug(
  db: SupabaseClient,
  baseSlug: string,
): Promise<string> {
  // Fetch every slug that starts with this base (catches base, base-2, base-3…)
  const { data, error } = await db
    .from('debates')
    .select('slug')
    .ilike('slug', `${baseSlug}%`)

  if (error) throw error

  const existing = new Set((data ?? []).map((r: { slug: string }) => r.slug))

  if (!existing.has(baseSlug)) return baseSlug

  let counter = 2
  while (existing.has(`${baseSlug}-${counter}`)) counter++
  return `${baseSlug}-${counter}`
}

/**
 * Generate a deterministic, always-unique slug for a tournament debate.
 * The tournament slug is itself unique; round and matchup numbers are unique
 * within a tournament — so this combination never collides.
 *
 * Pattern: {tournamentSlug}-r{roundNumber}-m{matchupNumber}
 * Example: "ai-regulation-2025-r1-m3"
 */
export function generateTournamentDebateSlug(
  tournamentSlug: string,
  roundNumber: number,
  matchupNumber: number,
): string {
  return `${tournamentSlug}-r${roundNumber}-m${matchupNumber}`
}
