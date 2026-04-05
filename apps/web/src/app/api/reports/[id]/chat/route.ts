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

  // Create Retell chat session if none exists
  let chatId = report.chat_id
  if (!chatId) {
    try {
      // Serialize body ContentBlocks to readable text for the agent
      const bodyText = report.body
        ? (report.body as ContentBlock[])
            .filter((b) => b.type === 'paragraph' || b.type === 'heading' || b.type === 'quote')
            .map((b) => b.content)
            .join('\n\n')
            .slice(0, 4000)
        : ''

      const createRes = await fetch(`${RETELL_API_BASE}/create-chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${retellApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: REPORTER_CHAT_AGENT_ID,
          retell_llm_dynamic_variables: {
            report_headline: report.report_headline ?? '',
            report_body: bodyText,
            key_entities: report.key_entities ?? '',
            sources_mentioned: report.sources_mentioned ?? '',
          },
        }),
      })

      if (!createRes.ok) {
        const errText = await createRes.text()
        console.error('Retell create-chat failed:', errText)
        return NextResponse.json({ error: 'Failed to start chat' }, { status: 500 })
      }

      const chatData = await createRes.json()
      chatId = chatData.chat_id as string

      // Save chat_id to report
      await db
        .from('reporter_calls')
        .update({ chat_id: chatId })
        .eq('id', report.id)
    } catch (err) {
      console.error('Create chat error:', err)
      return NextResponse.json({ error: 'Failed to start chat' }, { status: 500 })
    }
  }

  // Send message to Retell
  let reporterContent = ''
  try {
    const completionRes = await fetch(`${RETELL_API_BASE}/create-chat-completion`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${retellApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        content: message,
      }),
    })

    if (!completionRes.ok) {
      const errText = await completionRes.text()
      console.error('Retell chat-completion failed:', errText)
      return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
    }

    const completionData = await completionRes.json()
    // Extract agent response from messages array
    const agentMessages = (completionData.messages ?? [])
      .filter((m: { role: string; content?: string }) => m.role === 'agent' && m.content)
    reporterContent = agentMessages.map((m: { content: string }) => m.content).join('\n\n') || 'No response.'
  } catch (err) {
    console.error('Chat completion error:', err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
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
