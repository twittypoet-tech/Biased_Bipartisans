import type { OpenAIVoiceId } from './openai-tts.js'

/**
 * Maps agent archetypes to OpenAI TTS voice IDs.
 *
 * Voice personality assignments:
 * - hawk:           onyx   (deep, authoritative)
 * - dove:           nova   (warm, calm)
 * - technocrat:     echo   (precise, measured)
 * - populist:       fable  (expressive, animated)
 * - cynic:          shimmer (dry, sardonic)
 * - conspiracist:   fable  (intense, urgent)
 * - institutionalist: echo (steady, formal)
 * - libertarian:    onyx   (firm, direct)
 * - moderator:      alloy  (neutral, clear)
 */
export const ARCHETYPE_VOICE_MAP: Record<string, OpenAIVoiceId> = {
  hawk: 'onyx',
  dove: 'nova',
  technocrat: 'echo',
  populist: 'fable',
  cynic: 'shimmer',
  conspiracist: 'fable',
  institutionalist: 'echo',
  libertarian: 'onyx',
  moderator: 'alloy',
}

/**
 * Get the voice ID for an agent, preferring the explicit voiceId from
 * PersonaPacket, falling back to archetype mapping, then 'alloy' default.
 */
export function getVoiceId(voiceId: string | null, archetype: string): OpenAIVoiceId {
  if (voiceId && isValidVoice(voiceId)) return voiceId as OpenAIVoiceId
  return ARCHETYPE_VOICE_MAP[archetype.toLowerCase()] ?? 'alloy'
}

function isValidVoice(id: string): boolean {
  return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(id)
}
