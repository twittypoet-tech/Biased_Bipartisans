import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { insertReporterCall, generateUniqueReportSlug } from '@bipi/db'

const REPORTER_AGENT_ID = 'agent_0fd7ecb17c2e5717f23ed69511'

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

  // Only handle calls from The Reporter agent
  if (call.agent_id !== REPORTER_AGENT_ID) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const callId = call.call_id as string | undefined
  if (!callId) {
    return NextResponse.json({ error: 'Missing call_id' }, { status: 400 })
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
    (sourceCount ?? 0) > 4

  // ── Write to DB ───────────────────────────────────────────────────────────
  try {
    const db = createServerClient()

    // Generate unique slug from headline
    const slug = reportHeadline
      ? await generateUniqueReportSlug(db, reportHeadline)
      : callId

    await insertReporterCall(db, {
      slug,
      transcript,
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
