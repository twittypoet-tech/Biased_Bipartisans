/**
 * Generate unique DiceBear Bottts avatars for all agents
 * and upload them to Supabase Storage.
 *
 * Run with: pnpm avatars:generate
 */

import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'
import { getSupabaseClient, listAgents, updateAgentAvatar } from '@bipi/db'

const BUCKET_NAME = 'agent-avatars'

// Map agent archetype to background color hex values (without #)
const archetypeBackgroundMap: Record<string, string[]> = {
  hawk: ['b91c1c', 'dc2626'],
  dove: ['0ea5e9', '38bdf8'],
  technocrat: ['7c3aed', '8b5cf6'],
  populist: ['d97706', 'f59e0b'],
  cynic: ['52525b', '71717a'],
  conspiracy_theorist: ['059669', '10b981'],
  institutionalist: ['1d4ed8', '3b82f6'],
  libertarian: ['ea580c', 'f97316'],
}

async function main() {
  console.log('🤖 Generating DiceBear Bottts avatars for all agents...\n')

  const db = getSupabaseClient()

  // Fetch all agents
  const agents = await listAgents(db)
  console.log(`📋 Found ${agents.length} agents\n`)

  let successCount = 0
  let errorCount = 0

  // Generate and upload avatar for each agent
  for (const agent of agents) {
    try {
      const backgroundColor = archetypeBackgroundMap[agent.archetype] || [
        '52525b',
        '71717a',
      ]

      // Generate SVG
      const avatar = createAvatar(bottts, {
        seed: agent.name,
        backgroundColor,
        size: 256,
      })

      const svgString = avatar.toString()
      const filePath = `${agent.slug}.svg`

      // Upload to Supabase Storage
      const { error: uploadError } = await db.storage
        .from(BUCKET_NAME)
        .upload(filePath, svgString, {
          contentType: 'image/svg+xml',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = db.storage.from(BUCKET_NAME).getPublicUrl(filePath)
      const avatarUrl = data.publicUrl

      // Update agent record in DB
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
