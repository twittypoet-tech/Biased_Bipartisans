/**
 * POST /api/admin/reporter/update-prompt
 *
 * One-shot: injects {{current_date}} and {{user_query}} dynamic variable
 * references into The Reporter's Retell agent prompt.
 * Call once after deploy. Idempotent (safe to call again).
 */
import { NextResponse } from 'next/server'

const REPORTER_AGENT_ID = 'agent_0fd7ecb17c2e5717f23ed69511'
const RETELL_API_BASE   = 'https://api.retellai.com'

const DYNAMIC_VAR_SECTION = `\nToday's date: {{current_date}}

USER QUERY
----------
The listener has requested a report on: {{user_query}}
If user_query is empty or "breaking news today", default to the most
significant breaking story available right now.
Use {{user_query}} as the seed for your first search query.\n`

export async function POST() {
  const retellApiKey = process.env.RETELL_API_KEY
  if (!retellApiKey) {
    return NextResponse.json({ error: 'RETELL_API_KEY not set' }, { status: 500 })
  }

  // Fetch the current agent config
  const getRes = await fetch(`${RETELL_API_BASE}/v2/get-agent/${REPORTER_AGENT_ID}`, {
    headers: { Authorization: `Bearer ${retellApiKey}` },
  })
  if (!getRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 502 })
  }

  const agent = await getRes.json()
  const currentPrompt: string = agent?.llm_websocket_url
    ? ''
    : (agent?.response_engine?.general_prompt ?? agent?.general_prompt ?? '')

  // Replace hardcoded date line and inject dynamic var section after the
  // BRIGHT DATA section header
  let updatedPrompt = currentPrompt
    // Remove old hardcoded date (any variant)
    .replace(/Todays? date:.*?\n/gi, '')
    // Insert dynamic var block after the opening section break
    .replace(
      /(BRIGHT DATA MCP.*?SEARCH ARCHITECTURE)/,
      `${DYNAMIC_VAR_SECTION.trimStart()}\n$1`,
    )

  // If pattern didn't match (prompt structure changed), prepend at top
  if (!updatedPrompt.includes('{{current_date}}')) {
    updatedPrompt = DYNAMIC_VAR_SECTION + updatedPrompt
  }

  // Patch the agent's LLM
  const llmId: string = agent?.response_engine?.llm_id ?? ''
  if (!llmId) {
    return NextResponse.json({ error: 'Could not find llm_id on agent' }, { status: 500 })
  }

  const patchRes = await fetch(`${RETELL_API_BASE}/v2/update-retell-llm/${llmId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${retellApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ general_prompt: updatedPrompt }),
  })

  if (!patchRes.ok) {
    const err = await patchRes.text()
    console.error('Failed to patch LLM prompt:', err)
    return NextResponse.json({ error: 'Failed to update prompt', detail: err }, { status: 502 })
  }

  return NextResponse.json({ ok: true, promptLength: updatedPrompt.length })
}
