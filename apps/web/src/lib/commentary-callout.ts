/**
 * Shared callout palette + copy templates for the commentary progressive
 * disclosure UI (used by /commentary ThreadCard and the article page's
 * Agent Commentary section).
 *
 * Each thread gets a deterministic color + opening line based on a hash
 * of its report id. Palette colors are fixed hex values with enough
 * contrast for white text on both light and dark page backgrounds.
 */

export const CALLOUT_PALETTE = [
  '#C8A44A', // gold
  '#B84848', // red
  '#4D6EB8', // blue
  '#059669', // emerald
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#db2777', // pink
]

export const CALLOUT_TEMPLATES = [
  '{agent} just went off.',
  'Listen to {agent} make framing look like a sport.',
  'Enjoy the show.',
  '{agent} has thoughts. Loud ones.',
  'Someone put {agent} on the line.',
  '{agent} is in the room now.',
  'Wait until you hear what {agent} said.',
  '{agent} is not holding back.',
  'Grab a seat. {agent} is up.',
  'Hot mic: {agent}.',
  '{agent} versus the framing.',
  'This one earned a reply.',
]

export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function calloutFor(
  reportId: string,
  firstAgentName: string | undefined,
): { color: string; text: string } {
  const h = hashString(reportId)
  const color =
    CALLOUT_PALETTE[h % CALLOUT_PALETTE.length] ?? CALLOUT_PALETTE[0]!
  const template =
    CALLOUT_TEMPLATES[(h >> 3) % CALLOUT_TEMPLATES.length] ??
    CALLOUT_TEMPLATES[0]!
  const text = template.replace('{agent}', firstAgentName ?? 'This reporter')
  return { color, text }
}

export const REVEAL_CHUNK = 3
