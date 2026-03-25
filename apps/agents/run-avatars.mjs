import { config } from 'dotenv'
import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env from project root
config({ path: resolve(__dirname, '../../.env') })

const BUCKET_NAME = 'agent-avatars'

const archetypeBackgroundMap = {
  hawk: ['b91c1c', 'dc2626'],
  dove: ['0ea5e9', '38bdf8'],
  technocrat: ['7c3aed', '8b5cf6'],
  populist: ['d97706', 'f59e0b'],
  cynic: ['52525b', '71717a'],
  conspiracy_theorist: ['059669', '10b981'],
  institutionalist: ['1d4ed8', '3b82f6'],
  libertarian: ['ea580c', 'f97316'],
}

async function getSupabaseClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY')
  }

  return createClient(url, key)
}

async function listAgents(db) {
  const { data, error } = await db.from('agents').select('*')
  if (error) throw error
  return data || []
}

async function updateAgentAvatar(db, agentId, avatarUrl) {
  const { error } = await db
    .from('agents')
    .update({ avatar_url: avatarUrl })
    .eq('id', agentId)
  if (error) throw error
}

async function ensureBucket(db) {
  try {
    // Try to list buckets to see if our bucket exists
    const { data: buckets, error: listError } = await db.storage.listBuckets()

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)

    if (!bucketExists) {
      // Create bucket if it doesn't exist
      console.log(`📦 Creating storage bucket "${BUCKET_NAME}"...\n`)
      const { error: createError } = await db.storage.createBucket(BUCKET_NAME, {
        public: true,
      })
      if (createError) throw createError
    }
  } catch (error) {
    console.error(`Failed to ensure bucket: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
}

async function main() {
  console.log('🤖 Generating DiceBear Bottts avatars for all agents...\n')

  const db = await getSupabaseClient()

  // Ensure the bucket exists
  await ensureBucket(db)

  const agents = await listAgents(db)
  console.log(`📋 Found ${agents.length} agents\n`)

  let successCount = 0
  let errorCount = 0

  for (const agent of agents) {
    try {
      const backgroundColor = archetypeBackgroundMap[agent.archetype] || [
        '52525b',
        '71717a',
      ]

      const avatar = createAvatar(bottts, {
        seed: agent.name,
        backgroundColor,
        size: 256,
      })

      const svgString = avatar.toString()
      const filePath = `${agent.slug}.svg`

      const { error: uploadError } = await db.storage
        .from(BUCKET_NAME)
        .upload(filePath, svgString, {
          contentType: 'image/svg+xml',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data } = db.storage.from(BUCKET_NAME).getPublicUrl(filePath)
      const avatarUrl = data.publicUrl

      await updateAgentAvatar(db, agent.id, avatarUrl)

      console.log(`✓ ${agent.name.padEnd(25)} → ${avatarUrl}`)
      successCount++
    } catch (error) {
      console.error(`✗ ${agent.name}: ${error instanceof Error ? error.message : String(error)}`)
      errorCount++
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`)
  if (errorCount === 0) {
    console.log('✨ All avatars generated and uploaded successfully!')
  }

  process.exit(errorCount > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
