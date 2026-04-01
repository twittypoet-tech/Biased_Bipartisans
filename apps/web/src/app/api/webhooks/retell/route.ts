import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { insertReporterCall } from '@bipi/db'

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

  // Retell preset fields live directly on call_analysis
  const callSummary    = (analysis.call_summary    as string  | undefined) ?? null
  const callSuccessful = (analysis.call_successful as boolean | undefined) ?? null
  const userSentiment  = (analysis.user_sentiment  as string  | undefined) ?? null

  // Custom post-call fields — Retell puts them in call_analysis directly
  // (not nested under custom_analysis_data in the current SDK version)
  const reportHeadline   = (analysis.report_headline   as string  | undefined) ?? null
  const reportCategory   = (analysis.report_category   as string  | undefined) ?? null
  const sourceCount      = (analysis.source_count      as number  | undefined) ?? null
  const keyEntities      = (analysis.key_entities      as string  | undefined) ?? null
  const sourcesMentioned = (analysis.sources_mentioned as string  | undefined) ?? null
  const reportDelivered  = (analysis.report_delivered  as boolean | undefined) ?? null
  // Note: the Retell JSON had a leading space " sources_cited" — handle both
  const sourcesCited     = (
    (analysis.sources_cited as boolean | undefined) ??
    (analysis[' sources_cited'] as boolean | undefined)
  ) ?? null
  const reportQuality    = (analysis.report_quality    as string  | undefined) ?? null

  // ── Extract call metadata ─────────────────────────────────────────────────
  const recordingUrl    = (call.recording_url as string | undefined) ?? null
  const startTs         = call.start_timestamp as number | undefined
  const endTs           = call.end_timestamp   as number | undefined
  const durationSeconds = startTs && endTs ? Math.round((endTs - startTs) / 1000) : null

  const dynamicVars  = (call.retell_llm_dynamic_variables ?? {}) as Record<string, unknown>
  const userQuery    = (dynamicVars.user_query as string | undefined) ?? null
  const callLanguage = (call.language as string | undefined) ?? 'en-US'

  // ── Visibility gate ───────────────────────────────────────────────────────
  const isPublished = callSuccessful === true && reportDelivered === true

  // ── Write to DB ───────────────────────────────────────────────────────────
  try {
    const db = createServerClient()
    await insertReporterCall(db, {
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
