import { createClient } from '@supabase/supabase-js'

/** Public defaults — same project; env vars override only when valid (Railway may set broken truthy strings). */
const DEFAULT_URL = 'https://aispvlaozwogtihodmyk.supabase.co'
const DEFAULT_ANON_KEY = 'sb_publishable_rzkAKn8SBpw8qxu353PLUA_u27Sc63j'

export function coerceSupabaseUrl(raw: string | undefined): string {
  const v = raw?.trim()
  if (!v) return DEFAULT_URL
  try {
    const u = new URL(v)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return DEFAULT_URL
    return v
  } catch {
    return DEFAULT_URL
  }
}

export function coerceAnonKey(raw: string | undefined): string {
  const v = raw?.trim()
  if (!v || v.length < 20) return DEFAULT_ANON_KEY
  // Never use the service/secret key as the browser client key — Supabase returns "Invalid API key"
  if (v.startsWith('sb_secret_')) return DEFAULT_ANON_KEY
  return v
}

export const supabase = createClient(
  coerceSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  coerceAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
)

export type Task = {
  id: string
  title: string
  description: string
  owner: string
  owner_id: string | null
  due_date: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  created_at: string
}

export type ResearchEntry = {
  id: string
  subnet_name: string
  subnet_id: string | null
  description: string
  notes: string
  owner: string
  owner_id: string | null
  status: 'researching' | 'promising' | 'pass' | 'active'
  tags: string[]
  created_at: string
}

export type WalletEntry = {
  id: string
  wallet_name: string
  coldkey: string
  hotkey: string
  subnet_id: string | null
  stake: number
  daily_earnings: number
  notes: string
  created_at: string
}

export type AgentMessage = {
  id: string
  agent_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type AgentMemory = {
  id: string
  agent_id: string
  key: string
  content: string
  category: string
  updated_at: string
}
