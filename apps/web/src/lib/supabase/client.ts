import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

/**
 * Auth-aware browser client — manages session via cookies.
 * Used by client components for auth operations and user-scoped queries.
 */
export function getSupabaseBrowserClient() {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During build/SSR, env vars may not be available.
    // Return a dummy client that won't crash but won't work.
    // Real client is only used in browser after hydration.
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  _client = createBrowserClient(url, key)
  return _client
}
