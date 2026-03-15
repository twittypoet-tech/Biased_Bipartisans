/**
 * Environment variable validation.
 * Call at service startup to fail fast on missing config.
 */

export interface EnvRequirement {
  name: string
  required: boolean
  description: string
}

export function validateEnv(requirements: EnvRequirement[], serviceName: string): void {
  const missing: string[] = []

  for (const req of requirements) {
    if (req.required && !process.env[req.name]) {
      missing.push(`  ${req.name} — ${req.description}`)
    }
  }

  if (missing.length > 0) {
    console.error(`\n[${serviceName}] Missing required environment variables:\n`)
    console.error(missing.join('\n'))
    console.error(`\nCopy the .env.example file and fill in the values.\n`)
    process.exit(1)
  }
}

/** Environment requirements for the web app */
export const WEB_ENV: EnvRequirement[] = [
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, description: 'Supabase project URL' },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, description: 'Supabase anonymous key' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, description: 'Supabase service role key' },
  { name: 'NEXT_PUBLIC_LIVEKIT_URL', required: false, description: 'LiveKit WebSocket URL' },
  { name: 'LIVEKIT_API_KEY', required: false, description: 'LiveKit API key' },
  { name: 'LIVEKIT_API_SECRET', required: false, description: 'LiveKit API secret' },
]

/** Environment requirements for the agent worker */
export const AGENTS_ENV: EnvRequirement[] = [
  { name: 'SUPABASE_URL', required: true, description: 'Supabase project URL' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, description: 'Supabase service role key' },
  { name: 'ANTHROPIC_API_KEY', required: false, description: 'Anthropic API key (for Claude agents)' },
  { name: 'OPENAI_API_KEY', required: false, description: 'OpenAI API key (for GPT agents)' },
  { name: 'LIVEKIT_URL', required: false, description: 'LiveKit server URL' },
  { name: 'LIVEKIT_API_KEY', required: false, description: 'LiveKit API key' },
  { name: 'LIVEKIT_API_SECRET', required: false, description: 'LiveKit API secret' },
  { name: 'TAVILY_API_KEY', required: false, description: 'Tavily API key (research tool)' },
]

/** Environment requirements for the jobs service */
export const JOBS_ENV: EnvRequirement[] = [
  { name: 'SUPABASE_URL', required: true, description: 'Supabase project URL' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, description: 'Supabase service role key' },
  { name: 'INNGEST_EVENT_KEY', required: false, description: 'Inngest event key' },
  { name: 'INNGEST_SIGNING_KEY', required: false, description: 'Inngest signing key' },
]
