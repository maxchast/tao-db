'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Brain } from 'lucide-react'
import { supabase, type AgentMessage } from '@/lib/supabase'

interface ChatUIProps {
  agentId: string
  agentName: string
  /** Increment from parent (e.g. Agents tab) to refetch after external clear */
  refreshSignal?: number
}

export default function ChatUI({ agentId, agentName, refreshSignal = 0 }: ChatUIProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchHistory()
    const channel = supabase
      .channel(`agent-${agentId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_messages', filter: `agent_id=eq.${agentId}` }, () => {
        fetchHistory()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [agentId])

  useEffect(() => {
    if (refreshSignal === 0) return
    fetchHistory()
  }, [refreshSignal])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchHistory() {
    const { data } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true })
      .limit(100)
    if (data) setMessages(data)
    setHistoryLoading(false)
  }

  async function sendMessage() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setLoading(true)

    // Optimistic add
    const optimistic: AgentMessage = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, agentId }),
      })
      const data = await res.json()

      if (data.error) {
        const errMsg: AgentMessage = {
          id: crypto.randomUUID(),
          agent_id: agentId,
          role: 'assistant',
          content: `**Error:** ${data.error}`,
          created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, errMsg])
      } else {
        // Refresh from DB to get real messages
        await fetchHistory()
      }
    } catch {
      const errMsg: AgentMessage = {
        id: crypto.randomUUID(),
        agent_id: agentId,
        role: 'assistant',
        content: '**Error:** Failed to reach the agent. Check your connection.',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    }

    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', maxWidth: 900 }}>
      {/* Chat header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={14} style={{ color: 'var(--text-primary)' }} />
          <span style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            {agentName} · shared context
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '4px 4px 0 0',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {historyLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 40 }}>
            <Loader2 size={14} style={{ color: 'var(--text-dim)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>LOADING HISTORY...</span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Brain size={24} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {agentName}
            </p>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.04em', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              Ask about subnets, mining opportunities, staking strategies, hardware requirements, or anything Bittensor related. Knowledge is shared across the team.
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                {msg.role === 'user' ? 'YOU' : agentName.toUpperCase()}
              </span>
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: 4,
                  background: msg.role === 'user' ? 'var(--surface-2)' : 'transparent',
                  border: `1px solid ${msg.role === 'user' ? 'var(--border-bright)' : 'var(--border)'}`,
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  letterSpacing: '0.01em',
                }}
              >
                {msg.content}
              </div>
              <span style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <Loader2 size={12} style={{ color: 'var(--text-dim)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>Thinking...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 12,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${agentName}...`}
          rows={1}
          style={{
            flex: 1,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            padding: '10px 14px',
            fontSize: 12,
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            outline: 'none',
            resize: 'none',
            lineHeight: 1.5,
            maxHeight: 120,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-bright)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: '10px 14px',
            background: input.trim() && !loading ? 'var(--text-primary)' : 'var(--surface-2)',
            color: input.trim() && !loading ? 'var(--bg)' : 'var(--text-dim)',
            border: '1px solid var(--border)',
            borderRadius: 3,
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
