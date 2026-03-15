import { getSupabaseClient } from '@bipi/db'
import { createLogger } from '@bipi/shared'

const log = createLogger('agents:audio-storage')

const BUCKET = 'debate-audio'

/** PCM format from OpenAI TTS */
const SAMPLE_RATE = 24000
const NUM_CHANNELS = 1
const BITS_PER_SAMPLE = 16

/**
 * Encode raw PCM buffer as a WAV file (adds 44-byte header).
 * Input: 24kHz, 16-bit signed LE, mono PCM.
 */
function encodeWav(pcm: Buffer): Buffer {
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8)
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8)
  const dataSize = pcm.length
  const headerSize = 44

  const wav = Buffer.alloc(headerSize + dataSize)

  // RIFF header
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + dataSize, 4) // file size - 8
  wav.write('WAVE', 8)

  // fmt chunk
  wav.write('fmt ', 12)
  wav.writeUInt32LE(16, 16)           // chunk size
  wav.writeUInt16LE(1, 20)            // PCM format
  wav.writeUInt16LE(NUM_CHANNELS, 22)
  wav.writeUInt32LE(SAMPLE_RATE, 24)
  wav.writeUInt32LE(byteRate, 28)
  wav.writeUInt16LE(blockAlign, 32)
  wav.writeUInt16LE(BITS_PER_SAMPLE, 34)

  // data chunk
  wav.write('data', 36)
  wav.writeUInt32LE(dataSize, 40)
  pcm.copy(wav, headerSize)

  return wav
}

/**
 * Upload TTS audio for a debate turn to Supabase Storage.
 *
 * Converts raw PCM to WAV, uploads, and returns the public URL.
 */
export async function uploadTurnAudio(
  debateId: string,
  turnIndex: number,
  speakerName: string,
  pcmBuffer: Buffer,
): Promise<string | null> {
  try {
    const db = getSupabaseClient()
    const slug = speakerName.toLowerCase().replace(/\s+/g, '-')
    const path = `${debateId}/${String(turnIndex).padStart(4, '0')}-${slug}.wav`

    const wav = encodeWav(pcmBuffer)

    const { error: uploadError } = await db.storage
      .from(BUCKET)
      .upload(path, wav, {
        contentType: 'audio/wav',
        upsert: true,
      })

    if (uploadError) {
      log.warn(`Failed to upload audio: ${path}`, { error: String(uploadError) })
      return null
    }

    const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path)
    log.debug(`Uploaded turn audio: ${path} (${wav.length} bytes)`)
    return urlData.publicUrl
  } catch (err) {
    log.warn('Audio upload error', { error: String(err) })
    return null
  }
}
