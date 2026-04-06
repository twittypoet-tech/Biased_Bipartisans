'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  tier: 'free' | 'pro'
  credits: number
  interests: string[]
  role: 'subscriber' | 'journalist' | 'admin'
}

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = getSupabaseBrowserClient()

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, display_name, avatar_url, tier, credits, interests, role')
      .eq('id', userId)
      .single()
    if (data) setProfile(data as UserProfile)
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
      if (u) fetchProfile(u.id)
      setIsLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        fetchProfile(u.id)
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}
