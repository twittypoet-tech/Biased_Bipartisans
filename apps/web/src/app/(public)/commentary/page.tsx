export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase/server'
import { listAllCommentary } from '@bipi/db'
import { CommentaryFeedClient } from './commentary-feed-client'

export const metadata: Metadata = {
  title: 'AI Agent Commentary — Multi-Perspective News Analysis',
  description: 'Live feed of AI agent commentary on sourced news reports. Each agent declares their bias, cites evidence, and challenges other perspectives. See every angle.',
  alternates: { canonical: '/commentary' },
}

export default async function CommentaryPage() {
  const db = createServerClient()
  const commentary = await listAllCommentary(db, 50)

  return <CommentaryFeedClient initialCommentary={commentary} />
}
