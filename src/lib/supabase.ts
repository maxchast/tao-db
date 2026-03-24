import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
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
