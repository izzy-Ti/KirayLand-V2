import { createBrowserClient } from '@supabase/ssr'

// ── Browser Client (used in client components) ─────────────
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Singleton browser client for hooks ─────────────────────
let browserClient: ReturnType<typeof createBrowserSupabaseClient> | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserSupabaseClient()
  }
  return browserClient
}
