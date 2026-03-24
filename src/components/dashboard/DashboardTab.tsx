'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertTriangle, FlaskConical, TrendingUp, ListTodo } from 'lucide-react'
import { supabase, type Task, type ResearchEntry } from '@/lib/supabase'

function Card({ label, value, sub, icon: Icon, accent }: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent?: string
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '20px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          {label}
        </span>
        <Icon size={14} style={{ color: accent || 'var(--text-dim)' }} />
      </div>
      <div>
        <span style={{ fontSize: 28, fontWeight: 700, color: accent || 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          {value}
        </span>
        {sub && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 8, letterSpacing: '0.04em' }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}

function MiniRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', width: 100 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--text-primary)', opacity: 0.6, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 700, width: 24, textAlign: 'right' }}>
        {count}
      </span>
    </div>
  )
}

export default function DashboardTab() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [research, setResearch] = useState<ResearchEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
    const ch1 = supabase
      .channel('dash-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchAll)
      .subscribe()
    const ch2 = supabase
      .channel('dash-research')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'research_entries' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [])

  async function fetchAll() {
    const [t, r] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('research_entries').select('*').order('created_at', { ascending: false }),
    ])
    if (t.data) setTasks(t.data)
    if (r.data) setResearch(r.data)
    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done')
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done')
  const todoTasks = tasks.filter(t => t.status === 'todo')

  const researchCounts = {
    researching: research.filter(r => r.status === 'researching').length,
    promising: research.filter(r => r.status === 'promising').length,
    active: research.filter(r => r.status === 'active').length,
    pass: research.filter(r => r.status === 'pass').length,
  }

  // Recent activity: last 5 items across both tables by created_at
  const recentItems = [
    ...tasks.map(t => ({ type: 'task' as const, name: t.title, status: t.status, date: t.created_at })),
    ...research.map(r => ({ type: 'research' as const, name: r.subnet_name, status: r.status, date: r.created_at })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)

  if (loading) {
    return <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>LOADING...</p>
  }

  return (
    <div className="fade-in" style={{ maxWidth: 900 }}>
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '0.04em' }}>
          Overview of all tasks and research
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        <Card label="Total Tasks" value={tasks.length} sub={`${doneTasks.length} done`} icon={ListTodo} />
        <Card label="In Progress" value={inProgress.length} icon={Clock} />
        <Card
          label="Overdue"
          value={overdue.length}
          sub={overdue.length > 0 ? 'needs attention' : 'all clear'}
          icon={AlertTriangle}
          accent={overdue.length > 0 ? '#ff6b6b' : undefined}
        />
        <Card label="Subnets Tracked" value={research.length} sub={`${researchCounts.active} active`} icon={FlaskConical} />
      </div>

      {/* Two columns: task breakdown + research pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
        {/* Task Breakdown */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 20 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            TASK BREAKDOWN
          </span>
          <div style={{ marginTop: 16 }}>
            <MiniRow label="Todo" count={todoTasks.length} total={tasks.length} />
            <MiniRow label="In Progress" count={inProgress.length} total={tasks.length} />
            <MiniRow label="Done" count={doneTasks.length} total={tasks.length} />
          </div>
          {tasks.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
              {Math.round((doneTasks.length / tasks.length) * 100)}% completion rate
            </div>
          )}
        </div>

        {/* Research Pipeline */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 20 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            RESEARCH PIPELINE
          </span>
          <div style={{ marginTop: 16 }}>
            <MiniRow label="Researching" count={researchCounts.researching} total={research.length} />
            <MiniRow label="Promising" count={researchCounts.promising} total={research.length} />
            <MiniRow label="Active" count={researchCounts.active} total={research.length} />
            <MiniRow label="Pass" count={researchCounts.pass} total={research.length} />
          </div>
        </div>
      </div>

      {/* Overdue tasks */}
      {overdue.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertTriangle size={13} style={{ color: '#ff6b6b' }} />
            <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ff6b6b' }}>
              OVERDUE TASKS
            </span>
          </div>
          {overdue.map(task => (
            <div
              key={task.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{task.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{task.owner || '—'}</span>
                <span style={{ fontSize: 10, color: '#ff6b6b', letterSpacing: '0.04em' }}>
                  {task.due_date ? new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <TrendingUp size={13} style={{ color: 'var(--text-dim)' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            RECENT ACTIVITY
          </span>
        </div>
        {recentItems.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>No activity yet</p>
        ) : (
          recentItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: i < recentItems.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '2px 6px', borderRadius: 2,
                  border: '1px solid var(--border)',
                  color: 'var(--text-dim)',
                }}>
                  {item.type === 'task' ? 'TASK' : 'SUBNET'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{item.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  {item.status.replace('_', ' ')}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
