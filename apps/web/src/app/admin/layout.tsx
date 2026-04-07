import { redirect } from 'next/navigation'
import { createAuthServerClient, createServerClient } from '@/lib/supabase/server'
import { AdminNav } from './admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side auth + admin role check
  let isAdmin = false

  try {
    const authClient = await createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      redirect('/auth?redirect=/admin')
    }

    const db = createServerClient()
    const { data: profile } = await db
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    isAdmin = profile?.role === 'admin'
  } catch {
    redirect('/auth?redirect=/admin')
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="size-16 rounded-full bg-red-950/40 border border-red-800/60 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-sm text-neutral-400 mb-6">You do not have admin privileges. This area is restricted.</p>
          <a href="/" className="inline-flex rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: '#C8A44A' }}>
            Return to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav />
      <main className="flex-1 overflow-y-auto bg-neutral-950 p-4 lg:p-6">{children}</main>
    </div>
  )
}
