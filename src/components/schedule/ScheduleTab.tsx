'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase, type Task } from '@/lib/supabase'

const PRIORITY_DOT: Record<Task['priority'], string> = {
  low:    '#444',
  medium: '#888',
  high:   '#fff',
}

const STATUS_LABEL: Record<Task['status'], string> = {
  todo:        'TODO',
  in_progress: 'IN PROG',
  done:        'DONE',
}

const STATUS_CYCLE: Record<Task['status'], Task['status']> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
}

const emptyForm = {
  title: '',
  description: '',
  owner: '',
  due_date: '',
  status: 'todo' as Task['status'],
  priority: 'medium' as Task['priority'],
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 4,
      }}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 10,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      color: 'var(--text-dim)',
      fontFamily: 'inherit',
    }}>
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
        ...props.style,
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
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-bright)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      {children}
    </select>
  )
}

export default function ScheduleTab() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [filter, setFilter] = useState<'all' | Task['status']>('all')

  useEffect(() => {
    fetchTasks()
    const channel = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTasks(data)
    setLoading(false)
  }

  async function saveTask() {
    if (!form.title.trim()) return
    if (editingId) {
      await supabase.from('tasks').update({ ...form }).eq('id', editingId)
    } else {
      await supabase.from('tasks').insert([{ ...form }])
    }
    setForm(emptyForm)
    setShowForm(false)
    setEditingId(null)
    fetchTasks()
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    fetchTasks()
  }

  async function cycleStatus(task: Task) {
    await supabase.from('tasks').update({ status: STATUS_CYCLE[task.status] }).eq('id', task.id)
    fetchTasks()
  }

  function startEdit(task: Task) {
    setForm({
      title: task.title,
      description: task.description,
      owner: task.owner,
      due_date: task.due_date ?? '',
      status: task.status,
      priority: task.priority,
    })
    setEditingId(task.id)
    setShowForm(true)
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)
  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  }

  return (
    <div className="fade-in" style={{ maxWidth: 900 }}>

      {/* Top row: title + stats + add button */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Schedule
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '0.04em' }}>
            {tasks.length} tasks · {counts.in_progress} in progress · {counts.done} done
          </p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true) }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: 'var(--text-primary)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: 3,
            fontSize: 11,
            fontFamily: 'inherit',
            letterSpacing: '0.08em',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          <Plus size={12} />
          ADD TASK
        </button>
      </div>

      {/* Filter row */}
      <div className="flex gap-1 mb-5">
        {(['all', 'todo', 'in_progress', 'done'] as const).map(f => (
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
              fontSize: 10,
              fontFamily: 'inherit',
              letterSpacing: '0.1em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.15s ease',
            }}
          >
            {f === 'all' ? 'ALL' : f === 'in_progress' ? 'IN PROG' : f.toUpperCase()} · {counts[f]}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <Panel className="mb-5 fade-in">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>{editingId ? 'EDIT TASK' : 'NEW TASK'}</Label>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Input placeholder="Task title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <Input placeholder="Owner (e.g. Max)" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} />
            <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Task['status'] }))}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </Select>
            <Select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task['priority'] }))}>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </Select>
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.06em' }}
            >
              CANCEL
            </button>
            <button
              onClick={saveTask}
              style={{ padding: '7px 14px', background: 'var(--text-primary)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.06em' }}
            >
              {editingId ? 'SAVE' : 'ADD'}
            </button>
          </div>
        </Panel>
      )}

      {/* Task list */}
      {loading ? (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>LOADING...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>NO TASKS FOUND</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 60px', gap: 16, padding: '0 16px 8px', alignItems: 'center' }}>
            <Label>TITLE</Label>
            <Label>OWNER</Label>
            <Label>DUE</Label>
            <Label>STATUS</Label>
            <Label>PRI</Label>
          </div>

          {filtered.map((task, i) => (
            <div
              key={task.id}
              className="group"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 80px 80px 60px',
                gap: 16,
                padding: '12px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                alignItems: 'center',
                opacity: task.status === 'done' ? 0.4 : 1,
                animation: `fadeInUp 0.2s ease ${i * 0.03}s both`,
                transition: 'border-color 0.15s ease',
                cursor: 'default',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Title + description */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {task.title}
                  </span>
                </div>
                {task.description && (
                  <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.02em' }}>
                    {task.description}
                  </p>
                )}
              </div>

              {/* Owner */}
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                {task.owner || '—'}
              </span>

              {/* Due date */}
              <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
                {task.due_date
                  ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
              </span>

              {/* Status */}
              <button
                onClick={() => cycleStatus(task)}
                title="Click to advance"
                style={{
                  padding: '3px 7px',
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 2,
                  fontSize: 9,
                  fontFamily: 'inherit',
                  letterSpacing: '0.1em',
                  color: task.status === 'done' ? 'var(--text-dim)' : task.status === 'in_progress' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {STATUS_LABEL[task.status]}
              </button>

              {/* Priority + actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: PRIORITY_DOT[task.priority],
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: 'flex', gap: 4, opacity: 0 }} className="group-hover:opacity-100" >
                  <button
                    onClick={() => startEdit(task)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
