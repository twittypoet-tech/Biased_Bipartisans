import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const BUCKET = 'debate-audio'
const SAMPLE_RATE = 24000

/** Voice frequencies for different archetypes (placeholder tones) */
const ARCHETYPE_FREQ: Record<string, number> = {
  hawk: 165,
  dove: 392,
  technocrat: 262,
  populist: 330,
  cynic: 440,
  conspiracist: 294,
  institutionalist: 247,
  libertarian: 196,
  moderator: 220,
}

/** Generate a sine-wave PCM buffer as placeholder audio */
function generatePlaceholderPcm(text: string, archetype: string): Buffer {
  const wordCount = text.split(/\s+/).length
  const durationMs = Math.max(500, Math.min(wordCount * 100, 5000))
  const totalSamples = Math.round((durationMs / 1000) * SAMPLE_RATE)
  const freq = ARCHETYPE_FREQ[archetype] ?? 300

  const buf = Buffer.alloc(totalSamples * 2)
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE
    const fadeIn = Math.min(1, (i / SAMPLE_RATE) / 0.05)
    const fadeOut = Math.min(1, ((totalSamples - i) / SAMPLE_RATE) / 0.05)
    const sample = Math.round(8000 * fadeIn * fadeOut * Math.sin(2 * Math.PI * freq * t))
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2)
  }
  return buf
}

/** Encode raw PCM as WAV (44-byte header) */
function encodeWav(pcm: Buffer): Buffer {
  const byteRate = SAMPLE_RATE * 2
  const wav = Buffer.alloc(44 + pcm.length)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + pcm.length, 4)
  wav.write('WAVE', 8)
  wav.write('fmt ', 12)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(SAMPLE_RATE, 24)
  wav.writeUInt32LE(byteRate, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(pcm.length, 40)
  pcm.copy(wav, 44)
  return wav
}

/**
 * POST /api/admin/debates/[id]/backfill-audio
 *
 * Generates placeholder audio for all turns in a debate that lack audio URLs.
 * For real AI voices, set OPENAI_API_KEY in the agents service and run new debates.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: debateId } = await params
  const db = createServerClient()

  // Verify debate exists
  const { data: debate, error: debateErr } = await db
    .from('debates')
    .select('id, title, status')
    .eq('id', debateId)
    .single()

  if (debateErr || !debate) {
    return NextResponse.json({ error: 'Debate not found' }, { status: 404 })
  }

  // Fetch all turns with speaker info
  const { data: turns, error: turnsErr } = await db
    .from('debate_turns')
    .select('*, agents:speaker_id(name, archetype)')
    .eq('debate_id', debateId)
    .order('turn_index', { ascending: true })

  if (turnsErr || !turns) {
    return NextResponse.json({ error: 'Failed to fetch turns' }, { status: 500 })
  }

  const turnsNeedingAudio = turns.filter((t) => !t.audio_url)

  if (turnsNeedingAudio.length === 0) {
    return NextResponse.json({ ok: true, message: 'All turns already have audio', totalTurns: turns.length })
  }

  let generated = 0
  let failed = 0

  for (const turn of turnsNeedingAudio) {
    try {
      const agent = (turn as unknown as Record<string, unknown>).agents as Record<string, unknown> | null
      const archetype = (agent?.archetype as string) ?? (turn.speaker_type === 'moderator' ? 'moderator' : 'unknown')
      const speakerName = (agent?.name as string) ?? (turn.speaker_type === 'moderator' ? 'moderator' : 'speaker')
      const slug = speakerName.toLowerCase().replace(/\s+/g, '-')
      const path = `${debateId}/${String(turn.turn_index).padStart(4, '0')}-${slug}.wav`

      const pcm = generatePlaceholderPcm(turn.transcript, archetype)
      const wav = encodeWav(pcm)

      const { error: uploadErr } = await db.storage
        .from(BUCKET)
        .upload(path, wav, { contentType: 'audio/wav', upsert: true })

      if (uploadErr) {
        console.error(`Upload failed for turn ${turn.turn_index}:`, uploadErr)
        failed++
        continue
      }

      const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path)

      const { error: updateErr } = await db
        .from('debate_turns')
        .update({ audio_url: urlData.publicUrl })
        .eq('debate_id', debateId)
        .eq('turn_index', turn.turn_index)

      if (updateErr) {
        console.error(`DB update failed for turn ${turn.turn_index}:`, updateErr)
        failed++
        continue
      }

      generated++
    } catch (err) {
      console.error(`Failed to generate audio for turn ${turn.turn_index}:`, err)
      failed++
    }
  }

  return NextResponse.json({
    ok: true,
    totalTurns: turns.length,
    generated,
    failed,
    alreadyHadAudio: turns.length - turnsNeedingAudio.length,
  })
}
