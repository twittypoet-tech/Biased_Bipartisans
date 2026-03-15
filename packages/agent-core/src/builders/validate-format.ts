import type { RoomFormat } from '@bipi/shared'

/**
 * Validates that a debate's participant count matches its format requirements.
 */
export function validateParticipantCount(
  format: RoomFormat,
  minParticipants: number,
  maxParticipants: number,
  actualCount: number,
): { valid: boolean; error?: string } {
  if (actualCount < minParticipants) {
    return {
      valid: false,
      error: `Format "${format}" requires at least ${minParticipants} participants, got ${actualCount}`,
    }
  }
  if (actualCount > maxParticipants) {
    return {
      valid: false,
      error: `Format "${format}" allows at most ${maxParticipants} participants, got ${actualCount}`,
    }
  }
  return { valid: true }
}

/**
 * Generates a deterministic room name from debate metadata.
 */
export function generateRoomName(debateSlug: string): string {
  return `bipi-${debateSlug}`
}

/**
 * Generates a URL-safe slug from a debate title.
 */
export function generateDebateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}
