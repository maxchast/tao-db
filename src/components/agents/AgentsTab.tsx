'use client'

import { useState } from 'react'
import { FlaskConical, ScrollText, BarChart3, Wallet, HeartPulse, Bot, Trash2 } from 'lucide-react'
import ChatUI from './ChatUI'
import { supabase } from '@/lib/supabase'

type AgentId = 'research' | 'logs' | 'stats' | 'wallet' | 'health'

interface AgentDef {
  id: AgentId
  name: string
  description: string
  icon: React.ElementType
  ready: boolean
}

const AGENTS: AgentDef[] = [
  { id: 'research', name: 'Research Agent', description: 'Subnet research & TAO intel (OpenAI GPT)', icon: FlaskConical, ready: true },
  { id: 'logs',     name: 'Logs Agent',     description: 'Monitor and analyze miner/validator logs',    icon: ScrollText,   ready: false },
  { id: 'stats',    name: 'Stats Agent',    description: 'Network statistics and metagraph analysis',   icon: BarChart3,    ready: false },
  { id: 'wallet',   name: 'Wallet Agent',   description: 'Stake tracking, emissions, and earnings',     icon: Wallet,       ready: false },
  { id: 'health',   name: 'Health Agent',   description: 'Miner uptime, GPU status, and alerts',        icon: HeartPulse,   ready: false },
]

export default function AgentsTab() {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('research')
  const [chatRefreshSignal, setChatRefreshSignal] = useState(0)
  const [clearing, setClearing] = useState(false)
  const agent = AGENTS.find(a => a.id === selectedAgent)!

  async function clearChatHistory() {
    if (!agent.ready) return
    if (!window.confirm(`Clear all chat history for ${agent.name}?`)) return
    setClearing(true)
    const { error } = await supabase.from('agent_messages').delete().eq('agent_id', selectedAgent)
    setClearing(false)
    if (error) {
      window.alert(`Could not clear history: ${error.message}`)
      return
    }
    setChatRefreshSignal(n => n + 1)
  }

  return (
    <div className="fade-in">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Agents
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '0.04em' }}>
            AI-powered assistants for your TAO mining workflow
          </p>
        </div>
        {agent.ready && (
          <button
            type="button"
            onClick={clearChatHistory}
            disabled={clearing}
            title="Delete all messages for this agent from the database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 3,
              fontSize: 11,
              fontFamily: 'inherit',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
              cursor: clearing ? 'wait' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              if (!clearing) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
            }}
          >
            <Trash2 size={13} />
            CLEAR CHAT HISTORY
          </button>
        )}
      </div>

      {/* Agent selector */}
      <div className="flex gap-2 mb-5" style={{ flexWrap: 'wrap' }}>
        {AGENTS.map(a => {
          const Icon = a.icon
          const isActive = selectedAgent === a.id
          return (
            <button
              key={a.id}
              onClick={() => setSelectedAgent(a.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-bright)' : 'var(--border)',
                borderRadius: 3,
                background: isActive ? 'var(--surface-2)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-dim)',
                fontSize: 11,
                fontFamily: 'inherit',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
              }}
            >
              <Icon size={13} />
              <span>{a.name}</span>
              {!a.ready && (
                <span style={{
                  fontSize: 7,
                  letterSpacing: '0.12em',
                  padding: '1px 5px',
                  border: '1px solid var(--border)',
                  borderRadius: 2,
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                }}>
                  TBD
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Agent content */}
      {agent.ready ? (
        <ChatUI agentId={agent.id} agentName={agent.name} refreshSignal={chatRefreshSignal} />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            maxWidth: 900,
          }}
        >
          <Bot size={32} style={{ color: 'var(--text-dim)', marginBottom: 16 }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
            {agent.name}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.04em', marginBottom: 16, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
            {agent.description}
          </p>
          <span style={{
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: '6px 16px',
            border: '1px solid var(--border)',
            borderRadius: 3,
            color: 'var(--text-dim)',
          }}>
            COMING SOON
          </span>
        </div>
      )}
    </div>
  )
}
