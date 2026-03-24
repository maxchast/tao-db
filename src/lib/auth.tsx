'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

export type Profile = {
  id: string
  email: string
  display_name: string
  avatar_url: string
  created_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  profiles: Profile[]
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>) => Promise<{ error: string | null }>
  refreshProfiles: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }, [])

  const refreshProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('display_name', { ascending: true })
    if (data) setProfiles(data)
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id)
        refreshProfiles()
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        fetchProfile(s.user.id)
        refreshProfiles()
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile, refreshProfiles])

  async function signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }

    // Create profile
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        display_name: displayName,
        avatar_url: '',
      })
      await fetchProfile(data.user.id)
      await refreshProfiles()
    }
    return { error: null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    await refreshProfiles()
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setProfiles([])
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return { error: error.message }
    return { error: null }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function updateProfile(updates: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>) {
    if (!user) return { error: 'Not logged in' }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    if (error) return { error: error.message }
    await fetchProfile(user.id)
    await refreshProfiles()
    return { error: null }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, profiles, session, loading,
      signUp, signIn, signOut, resetPassword, updatePassword, updateProfile, refreshProfiles,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
