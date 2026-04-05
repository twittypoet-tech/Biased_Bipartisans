import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'
import type { ContentBlock } from '@bipi/shared'

const REPORTER_CHAT_AGENT_ID = 'agent_5150fe889ea51adcb99b5278fb'
const RETELL_API_BASE = 'https://api.retellai.com'

// ── GET: Load chat history ─────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = createServerClient()

  const { data: messages, error } = await db
    .from('report_chat_messages')
    .select('*')
    .eq('report_call_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }

  return NextResponse.json({ messages: messages ?? [] })
}

// ── POST: Send message + get Reporter response ─────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    return NextResponse.json({ error: 'Retell not configured' }, { status: 500 })
  }

  // Auth check
  const authClient = await createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to chat' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const message = (body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  const db = createServerClient()

  // Load report
  const { data: report } = await db
    .from('reporter_calls')
    .select('id, chat_id, report_headline, body, key_entities, sources_mentioned')
    .eq('id', id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // Load user profile
  const { data: profile } = await db
    .from('user_profiles')
    .select('display_name, tier, credits')
    .eq('id', user.id)
    .single()

  // Credit check for free users (1 credit per question)
  const isPro = profile?.tier === 'pro'
  if (!isPro && (profile?.credits ?? 0) < 1) {
    return NextResponse.json({ error: 'Not enough credits' }, { status: 402 })
  }

  // ── Helper: build dynamic vars for Retell chat session ─────────────────
  async function buildChatVars() {
    const bodyText = report.body
      ? (report.body as ContentBlock[])
          .filter((b) => b.type === 'paragraph' || b.type === 'heading' || b.type === 'quote')
          .map((b) => b.content).join('\n\n').slice(0, 4000)
      : ''

    // Load last 20 messages from our DB for conversation continuity
    const { data: priorMessages } = await db
      .from('report_chat_messages')
      .select('role, display_name, content')
      .eq('report_call_id', report.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const chatHistory = (priorMessages ?? [])
      .reverse()
      .map((m) => `${m.role === 'reporter' ? 'The Reporter' : (m.display_name ?? 'User')}: ${m.content}`)
      .join('\n')

    return {
      report_headline: report.report_headline ?? '',
      report_body: bodyText,
      key_entities: report.key_entities ?? '',
      sources_mentioned: report.sources_mentioned ?? '',
      ...(chatHistory ? { prior_discussion: chatHistory } : {}),
    }
  }

  // ── Helper: create a new Retell chat session ──────────────────────────
  async function createChatSession(): Promise<string> {
    const vars = await buildChatVars()
    const res = await fetch(`${RETELL_API_BASE}/create-chat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${retellApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: REPORTER_CHAT_AGENT_ID,
        retell_llm_dynamic_variables: vars,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    const newChatId = data.chat_id as string
    await db.from('reporter_calls').update({ chat_id: newChatId }).eq('id', report.id)
    return newChatId
  }

  // ── Create session if needed ──────────────────────────────────────────
  let chatId = report.chat_id
  if (!chatId) {
    try {
      chatId = await createChatSession()
    } catch (err) {
      console.error('Create chat error:', err)
      return NextResponse.json({ error: 'Failed to start chat' }, { status: 500 })
    }
  }

  // ── Send message (retry once if session expired) ──────────────────────
  let reporterContent = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completionRes = await fetch(`${RETELL_API_BASE}/create-chat-completion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${retellApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, content: message }),
      })

      if (!completionRes.ok) {
        const errText = await completionRes.text()
        if (attempt === 0 && (errText.includes('ended') || errText.includes('not found') || completionRes.status === 422)) {
          console.log('Retell chat session expired, creating new one with conversation history...')
          chatId = await createChatSession()
          continue
        }
        console.error('Retell chat-completion failed:', errText)
        return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
      }

      const completionData = await completionRes.json()
      const agentMessages = (completionData.messages ?? [])
        .filter((m: { role: string; content?: string }) => m.role === 'agent' && m.content)
      reporterContent = agentMessages.map((m: { content: string }) => m.content).join('\n\n') || 'No response.'
      break
    } catch (err) {
      console.error('Chat completion error:', err)
      if (attempt === 1) return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
    }
  }

  // Save both messages to DB
  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'User'
  const now = new Date().toISOString()

  const { data: userMsg } = await db
    .from('report_chat_messages')
    .insert({
      report_call_id: report.id,
      user_id: user.id,
      display_name: displayName,
      role: 'user',
      content: message,
    })
    .select()
    .single()

  const { data: reporterMsg } = await db
    .from('report_chat_messages')
    .insert({
      report_call_id: report.id,
      role: 'reporter',
      display_name: 'The Reporter',
      content: reporterContent,
    })
    .select()
    .single()

  // Deduct credit for free users
  if (!isPro) {
    await db
      .from('user_profiles')
      .update({ credits: Math.max(0, (profile?.credits ?? 0) - 1) })
      .eq('id', user.id)
    await db.from('credit_transactions').insert({
      user_id: user.id,
      amount: -1,
      reason: 'commentary',
      reference_id: report.id,
    })
  }

  return NextResponse.json({
    userMessage: userMsg,
    reporterMessage: reporterMsg,
  })
}
