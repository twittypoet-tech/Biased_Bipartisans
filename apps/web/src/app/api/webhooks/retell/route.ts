import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'
import { insertReporterCall, generateUniqueReportSlug } from '@bipi/db'
import type { ContentBlock, Callout } from '@bipi/shared'

const REPORTER_AGENT_ID = 'agent_0fd7ecb17c2e5717f23ed69511'
const ONBOARDING_AGENT_ID = 'agent_dc30d418ef88204e5452f1eed5'

export async function POST(request: Request) {
  // Always respond quickly — Retell retries on slow responses
  const rawBody = await request.text()

  // Optional webhook secret validation
  const secret = process.env.RETELL_WEBHOOK_SECRET
  if (secret) {
    const signature = request.headers.get('x-retell-signature') ?? ''
    if (signature !== secret) {
      console.warn('Retell webhook: invalid signature')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event = payload.event as string | undefined

  // We only process post-call analysis events
  if (event !== 'call_analyzed') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const call = payload.call as Record<string, unknown> | undefined
  if (!call) {
    return NextResponse.json({ error: 'Missing call object' }, { status: 400 })
  }

  const callId = call.call_id as string | undefined
  if (!callId) {
    return NextResponse.json({ error: 'Missing call_id' }, { status: 400 })
  }

  // ── Route by agent ────────────────────────────────────────────────────────
  if (call.agent_id === ONBOARDING_AGENT_ID) {
    return handleOnboardingCall(call, callId)
  }

  // Only handle calls from The Reporter agent below
  if (call.agent_id !== REPORTER_AGENT_ID) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  // ── Extract analysis fields ───────────────────────────────────────────────
  const analysis = (call.call_analysis ?? {}) as Record<string, unknown>

  // Log the raw analysis object to debug missing fields
  console.log('reporter webhook: call_analysis keys:', Object.keys(analysis))
  console.log('reporter webhook: call_analysis:', JSON.stringify(analysis).slice(0, 2000))

  // Retell may put custom fields directly in call_analysis OR under
  // custom_analysis_data — merge both to handle either structure
  const customData = (analysis.custom_analysis_data ?? {}) as Record<string, unknown>
  const merged = { ...customData, ...analysis }

  // Retell preset fields
  const callSummary    = (merged.call_summary    as string  | undefined) ?? null
  const callSuccessful = (merged.call_successful as boolean | undefined) ?? null
  const userSentiment  = (merged.user_sentiment  as string  | undefined) ?? null

  // Custom post-call fields
  const reportHeadline   = (merged.report_headline   as string  | undefined) ?? null
  const reportCategory   = (merged.report_category   as string  | undefined) ?? null
  const sourceCount      = (merged.source_count      as number  | undefined) ?? null
  const keyEntities      = (merged.key_entities      as string  | undefined) ?? null
  const sourcesMentioned = (merged.sources_mentioned as string  | undefined) ?? null
  const reportDelivered  = (merged.report_delivered  as boolean | undefined) ?? null
  // Handle leading-space variant from Retell config
  const sourcesCited     = (
    (merged.sources_cited as boolean | undefined) ??
    (merged[' sources_cited'] as boolean | undefined)
  ) ?? null
  const reportQuality    = (merged.report_quality    as string  | undefined) ?? null
  const publishToBipi    = (merged.publish_to_bipi   as boolean | undefined) ?? null

  // Parse structured sources (JSON array of {title, url})
  // Check multiple possible key names — Retell sometimes adds leading spaces
  const rawSourcesJson = (
    merged.sources_with_urls ??
    merged[' sources_with_urls'] ??
    (customData as Record<string, unknown>).sources_with_urls ??
    null
  ) as string | unknown[] | undefined ?? null

  console.log('reporter webhook: sources_with_urls raw:', rawSourcesJson ? JSON.stringify(rawSourcesJson).slice(0, 500) : 'null')

  let sourcesJson: Array<{ title: string; url: string | null }> | null = null
  if (rawSourcesJson) {
    try {
      const parsed = typeof rawSourcesJson === 'string' ? JSON.parse(rawSourcesJson) : rawSourcesJson
      if (Array.isArray(parsed)) {
        sourcesJson = parsed.map((s: Record<string, unknown>) => ({
          title: String(s.title ?? s.name ?? ''),
          url: s.url ? String(s.url) : (s.link ? String(s.link) : null),
        })).filter((s) => s.title)
      }
    } catch {
      console.warn('reporter webhook: failed to parse sources_with_urls', rawSourcesJson)
    }
  }

  // ── Extract call metadata ─────────────────────────────────────────────────
  const recordingUrl    = (call.recording_url as string | undefined) ?? null
  const startTs         = call.start_timestamp as number | undefined
  const endTs           = call.end_timestamp   as number | undefined
  const durationSeconds = startTs && endTs ? Math.round((endTs - startTs) / 1000) : null

  const dynamicVars  = (call.retell_llm_dynamic_variables ?? {}) as Record<string, unknown>
  const userQuery    = (dynamicVars.user_query as string | undefined) ?? null
  const callLanguage = (call.language as string | undefined) ?? 'en-US'

  // ── Extract full transcript ────────────────────────────────────────────
  const transcriptObject = (call.transcript_object as Array<{ role: string; content: string }> | undefined) ?? []
  const transcript = transcriptObject.length > 0
    ? transcriptObject
        .map((t) => `${t.role === 'agent' ? 'The Reporter' : 'Caller'}: ${t.content}`)
        .join('\n\n')
    : null

  // ── Visibility gate ────────────────────────────────────────────────────
  const isPublished =
    reportDelivered === true &&
    reportQuality === 'Complete' &&
    (sourceCount ?? 0) >= 1

  // ── Write to DB ───────────────────────────────────────────────────────────
  try {
    const db = createServerClient()

    // Generate unique slug from headline
    const slug = reportHeadline
      ? await generateUniqueReportSlug(db, reportHeadline)
      : callId

    // ── Structure transcript into rich editorial content via GPT-4o ──────
    let structuredBody: ContentBlock[] | null = null
    let structuredCallouts: Callout[] | null = null

    if (transcript) {
      try {
        const result = await structureTranscript(transcript)
        structuredBody = result.body
        structuredCallouts = result.callouts
        console.log('reporter webhook: structured transcript into', structuredBody?.length ?? 0, 'blocks +', structuredCallouts?.length ?? 0, 'callouts')
      } catch (err) {
        console.warn('reporter webhook: transcript structuring failed, saving plain text only', err)
      }
    }

    await insertReporterCall(db, {
      slug,
      transcript,
      body: structuredBody,
      callouts: structuredCallouts,
      sources_json: sourcesJson,
      retell_call_id: callId,
      call_summary:    callSummary,
      call_successful: callSuccessful,
      user_sentiment:  userSentiment,
      report_headline:   reportHeadline,
      report_category:   reportCategory,
      source_count:      sourceCount,
      key_entities:      keyEntities,
      sources_mentioned: sourcesMentioned,
      report_delivered:  reportDelivered,
      sources_cited:     sourcesCited,
      report_quality:    reportQuality,
      publish_to_bipi:  publishToBipi,
      recording_url:    recordingUrl,
      call_language:    callLanguage,
      user_query:       userQuery,
      duration_seconds: durationSeconds,
      is_published:     isPublished,
    })
  } catch (err) {
    console.error('reporter webhook: DB write failed', err)
    // Return 200 anyway — Retell should not retry on our DB errors
    return NextResponse.json({ ok: true, dbError: true })
  }

  return NextResponse.json({ ok: true, published: isPublished })
}

// ── Transcript structuring via GPT-4o ────────────────────────────────────────

async function structureTranscript(rawTranscript: string): Promise<{ body: ContentBlock[]; callouts: Callout[] }> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')

  // Extract reporter-only speech
  const reporterStart = rawTranscript.indexOf('The Reporter:')
  const reporterText = reporterStart >= 0
    ? rawTranscript.slice(reporterStart + 'The Reporter:'.length).trim()
    : rawTranscript

  if (reporterText.length < 50) {
    return { body: [{ type: 'paragraph', content: reporterText }], callouts: [] }
  }

  const openai = new OpenAI({ apiKey: openaiKey })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a news editor. Convert this spoken news transcript into structured editorial content.

Output a JSON object with exactly two keys:
- "body": array of ContentBlock objects (the article body)
- "callouts": array of Callout objects (highlighted elements)

ContentBlock types:
- { "type": "heading", "content": "...", "level": 2 } — major section headers (use for topic transitions)
- { "type": "heading", "content": "...", "level": 3 } — sub-section headers
- { "type": "paragraph", "content": "..." } — body text paragraphs
- { "type": "quote", "content": "..." } — direct quotes from people or sources (things someone actually said)
- { "type": "divider" } — visual section breaks between major topics

Callout types (sidebar/highlighted elements):
- { "type": "fact", "content": "..." } — key verified facts worth highlighting
- { "type": "person", "content": "..." } — notable people mentioned with brief context
- { "type": "date", "content": "..." } — important dates or timeline events
- { "type": "issue", "content": "..." } — key tensions, controversies, or open questions

Rules:
- Create 2-5 section headings based on topic transitions in the report
- Extract actual direct quotes (words someone said, indicated by "quoting directly" or quotation patterns) as quote blocks
- Identify 2-5 key callouts across the report
- Clean up spoken artifacts (um, uh, filler words, false starts)
- Convert spoken numbers ("twenty twenty-six") to written form ("2026")
- Keep all factual content — do NOT add, invent, or remove information
- Make paragraphs editorial and polished, not transcription-style
- Each paragraph should be 2-4 sentences
- Don't include the reporter's opening greeting or closing handoff
- Callouts should have a "block_order" number indicating after which body block index to render them`,
      },
      {
        role: 'user',
        content: reporterText,
      },
    ],
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty GPT response')

  const parsed = JSON.parse(content)
  const body = Array.isArray(parsed.body) ? parsed.body as ContentBlock[] : []
  const callouts = Array.isArray(parsed.callouts) ? parsed.callouts as Callout[] : []

  return { body, callouts }
}

// ── Onboarding call handler ─────────────────────────────────────────────────

async function handleOnboardingCall(call: Record<string, unknown>, callId: string) {
  const analysis = (call.call_analysis ?? {}) as Record<string, unknown>
  const customData = (analysis.custom_analysis_data ?? {}) as Record<string, unknown>
  const merged = { ...customData, ...analysis }

  console.log('onboarding webhook: analysis keys:', Object.keys(merged))

  // Extract interest fields
  const rawInterests = (merged.user_interests ?? merged[' user_interests']) as string | undefined
  const rawEntities = (merged.interest_entities ?? merged[' interest_entities']) as string | undefined
  const onboardingSuccessful = (merged.onboarding_successful ?? merged[' onboarding_successful']) as boolean | undefined
  const interestSummary = (merged.interest_summary ?? merged[' interest_summary']) as string | undefined

  // Parse interests JSON array
  let interests: string[] = []
  if (rawInterests) {
    try {
      const parsed = typeof rawInterests === 'string' ? JSON.parse(rawInterests) : rawInterests
      if (Array.isArray(parsed)) interests = parsed.map(String).filter(Boolean)
    } catch {
      console.warn('onboarding webhook: failed to parse user_interests', rawInterests)
    }
  }

  // Parse entities
  let entities: string[] = []
  if (rawEntities) {
    try {
      const parsed = typeof rawEntities === 'string' ? JSON.parse(rawEntities) : rawEntities
      if (Array.isArray(parsed)) entities = parsed.map(String).filter(Boolean)
    } catch {
      console.warn('onboarding webhook: failed to parse interest_entities', rawEntities)
    }
  }

  // Get user_id from dynamic variables
  const dynamicVars = (call.retell_llm_dynamic_variables ?? {}) as Record<string, unknown>
  const userId = dynamicVars.user_id as string | undefined

  if (!userId) {
    console.error('onboarding webhook: no user_id in dynamic variables')
    return NextResponse.json({ ok: true, error: 'no user_id' })
  }

  // Combine interests + entities into the interests array
  const allInterests = [...new Set([...interests, ...entities])]

  console.log('onboarding webhook: updating user', userId, 'with interests:', allInterests)

  // Update user profile
  try {
    const db = createServerClient()
    await db
      .from('user_profiles')
      .update({ interests: allInterests })
      .eq('id', userId)

    console.log('onboarding webhook: profile updated successfully')
  } catch (err) {
    console.error('onboarding webhook: DB update failed', err)
  }

  return NextResponse.json({ ok: true, onboarding: true, interestCount: allInterests.length })
}
