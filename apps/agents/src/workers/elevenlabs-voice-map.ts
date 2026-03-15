/**
 * Maps agent archetypes to ElevenLabs voice IDs.
 *
 * These are pre-made ElevenLabs voices chosen to match each archetype's personality.
 * Voice IDs can be replaced with custom/cloned voices via the ElevenLabs dashboard.
 *
 * To find more voice IDs: https://api.elevenlabs.io/v1/voices
 */
export const ELEVENLABS_VOICE_MAP: Record<string, string> = {
  // Pre-made ElevenLabs voices matched to debate archetypes
  hawk: 'pNInz6obpgDQGcFmaJgB',          // Adam — deep, authoritative
  dove: '21m00Tcm4TlvDq8ikWAM',           // Rachel — warm, calm
  technocrat: 'TxGEqnHWrfWFTfGW9XjX',    // Josh — precise, measured
  populist: 'VR6AewLTigWG4xSOukaG',       // Arnold — expressive, animated
  cynic: 'yoZ06aMxZJJ28mfd3POQ',          // Sam — dry, sardonic
  conspiracist: 'ErXwobaYiN019PkySvjV',   // Antoni — intense, urgent
  institutionalist: 'N2lVS1w4EtoT3dr4eOWO', // Callum — steady, formal
  libertarian: 'ODq5zmih8GrVes37Dizd',    // Patrick — firm, direct
  moderator: 'jsCqWAovK2LkecY7zXl4',     // Freya — neutral, clear
}

/**
 * Get the ElevenLabs voice ID for an agent.
 * Prefers explicit voiceId from PersonaPacket, falls back to archetype map.
 */
export function getElevenLabsVoiceId(voiceId: string | null, archetype: string): string {
  // If the persona has an explicit ElevenLabs voice ID set, use it
  if (voiceId && !isOpenAIVoiceId(voiceId)) return voiceId

  return ELEVENLABS_VOICE_MAP[archetype.toLowerCase()] ?? ELEVENLABS_VOICE_MAP.moderator!
}

/** OpenAI voice IDs — if voiceId is one of these, ignore it (wrong provider) */
function isOpenAIVoiceId(id: string): boolean {
  return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(id)
}
