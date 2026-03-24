'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Tag, ChevronDown, ChevronUp, Search, ArrowUpDown } from 'lucide-react'
import { supabase, type ResearchEntry } from '@/lib/supabase'

const STATUS_CONFIG = {
  researching: { label: 'RESEARCHING', color: 'var(--text-secondary)' },
  promising:   { label: 'PROMISING',   color: '#fff' },
  active:      { label: 'ACTIVE',      color: '#fff' },
  pass:        { label: 'PASS',        color: 'var(--text-dim)' },
}

const STATUS_BAR: Record<ResearchEntry['status'], number> = {
  researching: 25,
  promising:   60,
  active:      100,
  pass:        0,
}

const emptyForm = {
  subnet_name: '',
  subnet_id: '',
  description: '',
  notes: '',
  status: 'researching' as ResearchEntry['status'],
  tags: [] as string[],
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-dim)', fontFamily: 'inherit' }}>
      {children}
    </span>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 3,
        padding: '8px 12px',
        fontSize: 12,
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        outline: 'none',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-bright)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    />
  )
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{
        width: '100%',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 3,
        padding: '8px 12px',
        fontSize: 12,
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        outline: 'none',
        resize: 'none',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-bright)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    />
  )
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 3,
        padding: '8px 12px',
        fontSize: 12,
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </select>
  )
}

export default function ResearchTab() {
  const [entries, setEntries] = useState<ResearchEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [tagInput, setTagInput] = useState('')
  const [filter, setFilter] = useState<'all' | ResearchEntry['status']>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'status'>('created')

  useEffect(() => {
    fetchEntries()
    const channel = supabase
      .channel('research')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'research_entries' }, fetchEntries)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchEntries() {
    const { data } = await supabase
      .from('research_entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setEntries(data)
    setLoading(false)
  }

  async function saveEntry() {
    if (!form.subnet_name.trim()) return
    const payload = { ...form, subnet_id: form.subnet_id || null }
    if (editingId) {
      await supabase.from('research_entries').update(payload).eq('id', editingId)
    } else {
      await supabase.from('research_entries').insert([payload])
    }
    setForm(emptyForm)
    setTagInput('')
    setShowForm(false)
    setEditingId(null)
    fetchEntries()
  }

  async function deleteEntry(id: string) {
    await supabase.from('research_entries').delete().eq('id', id)
    fetchEntries()
  }

  function startEdit(entry: ResearchEntry) {
    setForm({
      subnet_name: entry.subnet_name,
      subnet_id: entry.subnet_id ?? '',
      description: entry.description,
      notes: entry.notes,
      status: entry.status,
      tags: entry.tags ?? [],
    })
    setEditingId(entry.id)
    setShowForm(true)
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    setTagInput('')
  }

  const STATUS_ORDER: Record<ResearchEntry['status'], number> = { active: 0, promising: 1, researching: 2, pass: 3 }

  const searched = entries.filter(e => {
    if (!search) return true
    const q = search.toLowerCase()
    return e.subnet_name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q) || (e.tags ?? []).some(t => t.toLowerCase().includes(q))
  })

  const statusFiltered = filter === 'all' ? searched : searched.filter(e => e.status === filter)

  const filtered = [...statusFiltered].sort((a, b) => {
    if (sortBy === 'name') return a.subnet_name.localeCompare(b.subnet_name)
    if (sortBy === 'status') return STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  const counts = {
    all: entries.length,
    researching: entries.filter(e => e.status === 'researching').length,
    promising:   entries.filter(e => e.status === 'promising').length,
    active:      entries.filter(e => e.status === 'active').length,
    pass:        entries.filter(e => e.status === 'pass').length,
  }

  return (
    <div className="fade-in" style={{ maxWidth: 900 }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Subnet Research
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '0.04em' }}>
            {entries.length} tracked · {counts.promising} promising · {counts.active} active
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setTagInput(''); setEditingId(null); setShowForm(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            background: 'var(--text-primary)',
            color: 'var(--bg)',
            border: 'none', borderRadius: 3,
            fontSize: 11, fontFamily: 'inherit',
            letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700,
          }}
        >
          <Plus size={12} />
          ADD SUBNET
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3 mb-4" style={{ alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
          <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <Input
            placeholder="Search subnets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowUpDown size={11} style={{ color: 'var(--text-dim)' }} />
          {(['created', 'name', 'status'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                padding: '4px 10px',
                border: '1px solid',
                borderColor: sortBy === s ? 'var(--border-bright)' : 'var(--border)',
                borderRadius: 2,
                background: sortBy === s ? 'var(--surface-2)' : 'transparent',
                color: sortBy === s ? 'var(--text-primary)' : 'var(--text-dim)',
                fontSize: 9,
                fontFamily: 'inherit',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.15s ease',
              }}
            >
              {s === 'created' ? 'NEWEST' : s === 'name' ? 'NAME' : 'STATUS'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-5">
        {(['all', 'researching', 'promising', 'active', 'pass'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 12px',
              border: '1px solid',
              borderColor: filter === f ? 'var(--border-bright)' : 'var(--border)',
              borderRadius: 2,
              background: filter === f ? 'var(--surface-2)' : 'transparent',
              color: filter === f ? 'var(--text-primary)' : 'var(--text-dim)',
              fontSize: 10, fontFamily: 'inherit',
              letterSpacing: '0.1em', cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.15s ease',
            }}
          >
            {f === 'all' ? 'ALL' : STATUS_CONFIG[f].label} · {counts[f]}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div
          className="fade-in mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>{editingId ? 'EDIT SUBNET' : 'NEW SUBNET'}</Label>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input placeholder="Subnet name *" value={form.subnet_name} onChange={e => setForm(f => ({ ...f, subnet_name: e.target.value }))} />
            <Input placeholder="Subnet ID / UID" value={form.subnet_id} onChange={e => setForm(f => ({ ...f, subnet_id: e.target.value }))} />
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea placeholder="Description — what does this subnet do?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea placeholder="Notes — requirements, emission rates, observations, links..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ResearchEntry['status'] }))}>
              <option value="researching">Researching</option>
              <option value="promising">Promising</option>
              <option value="active">Active</option>
              <option value="pass">Pass</option>
            </Select>
            <div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Input
                  placeholder="Add tag (Enter)"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <button onClick={addTag} style={{ padding: '0 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <Tag size={12} />
                </button>
              </div>
              {form.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {form.tags.map(tag => (
                    <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>
                      {tag}
                      <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', lineHeight: 1 }}>
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.06em' }}>
              CANCEL
            </button>
            <button onClick={saveEntry}
              style={{ padding: '7px 14px', background: 'var(--text-primary)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.06em' }}>
              {editingId ? 'SAVE' : 'ADD'}
            </button>
          </div>
        </div>
      )}

      {/* Entries */}
      {loading ? (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>LOADING...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>NO ENTRIES FOUND</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((entry, i) => {
            const cfg = STATUS_CONFIG[entry.status]
            const isExpanded = expandedId === entry.id
            const bar = STATUS_BAR[entry.status]

            return (
              <div
                key={entry.id}
                className="group"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  animation: `fadeInUp 0.2s ease ${i * 0.03}s both`,
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                {/* Progress bar top */}
                {bar > 0 && (
                  <div style={{ height: 1, background: 'var(--surface-2)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bar}%`, background: 'var(--text-primary)', opacity: entry.status === 'active' ? 1 : 0.4, transition: 'width 0.5s ease' }} />
                  </div>
                )}

                <div style={{ padding: '14px 16px' }}>
                  {/* Row 1: name + status + actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                          {entry.subnet_name}
                        </span>
                        {entry.subnet_id && (
                          <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
                            UID:{entry.subnet_id}
                          </span>
                        )}
                      </div>
                    </div>

                    <span style={{ fontSize: 9, letterSpacing: '0.12em', color: cfg.color, border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 2 }}>
                      {cfg.label}
                    </span>

                    <div style={{ display: 'flex', gap: 4, opacity: 0 }} className="group-hover:opacity-100">
                      <button onClick={() => startEdit(entry)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}>
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}>
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {entry.notes && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  {entry.description && (
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5, letterSpacing: '0.02em' }}>
                      {entry.description}
                    </p>
                  )}

                  {/* Expanded notes */}
                  {isExpanded && entry.notes && (
                    <div
                      className="fade-in"
                      style={{
                        marginTop: 12,
                        padding: 12,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 3,
                      }}
                    >
                      <Label>NOTES</Label>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.7, whiteSpace: 'pre-wrap', letterSpacing: '0.02em' }}>
                        {entry.notes}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      {entry.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 9, padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 2, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
