'use client'

import { useState, useEffect } from 'react'
import { User, Lock, LogOut, CheckCircle, Clock, FlaskConical, Loader2 } from 'lucide-react'
import { useAuth, type Profile } from '@/lib/auth'
import { supabase, type Task, type ResearchEntry } from '@/lib/supabase'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-dim)', fontFamily: 'inherit' }}>
      {children}
    </span>
  )
}

function StatBox({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3, padding: '14px 16px', textAlign: 'center' }}>
      <Icon size={14} style={{ color: 'var(--text-dim)', margin: '0 auto 8px' }} />
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function ProfileTab() {
  const { profile, user, signOut, updateProfile, updatePassword } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [pwMessage, setPwMessage] = useState('')
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [myResearch, setMyResearch] = useState<ResearchEntry[]>([])

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name)
      fetchMyItems()
    }
  }, [profile])

  async function fetchMyItems() {
    if (!profile) return
    const [tasks, research] = await Promise.all([
      supabase.from('tasks').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('research_entries').select('*').eq('owner_id', profile.id).order('created_at', { ascending: false }),
    ])
    if (tasks.data) setMyTasks(tasks.data)
    if (research.data) setMyResearch(research.data)
  }

  async function handleSaveProfile() {
    setSaving(true)
    setMessage('')
    const { error } = await updateProfile({ display_name: displayName.trim() })
    setMessage(error || 'Profile updated')
    setSaving(false)
  }

  async function handleChangePassword() {
    setPwMessage('')
    if (newPassword.length < 6) { setPwMessage('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setPwMessage('Passwords do not match'); return }
    setPasswordSaving(true)
    const { error } = await updatePassword(newPassword)
    setPwMessage(error || 'Password updated')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordSaving(false)
  }

  const tasksDone = myTasks.filter(t => t.status === 'done').length
  const tasksInProg = myTasks.filter(t => t.status === 'in_progress').length

  return (
    <div className="fade-in" style={{ maxWidth: 700 }}>
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Profile
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '0.04em' }}>
          {user?.email}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        <StatBox label="My Tasks" value={myTasks.length} icon={CheckCircle} />
        <StatBox label="In Progress" value={tasksInProg} icon={Clock} />
        <StatBox label="Completed" value={tasksDone} icon={CheckCircle} />
        <StatBox label="My Research" value={myResearch.length} icon={FlaskConical} />
      </div>

      {/* Profile Settings */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={13} style={{ color: 'var(--text-dim)' }} />
          <Label>PROFILE SETTINGS</Label>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>DISPLAY NAME</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
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
          </div>
          <div>
            <label style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input
              value={user?.email ?? ''}
              disabled
              style={{
                width: '100%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--text-dim)',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'not-allowed',
              }}
            />
          </div>
          {message && (
            <p style={{ fontSize: 10, color: message.includes('updated') ? '#4ade80' : '#ff6b6b', letterSpacing: '0.04em' }}>{message}</p>
          )}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            style={{
              alignSelf: 'flex-start',
              padding: '7px 14px',
              background: 'var(--text-primary)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 3,
              fontSize: 11,
              fontFamily: 'inherit',
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {saving && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
            SAVE
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={13} style={{ color: 'var(--text-dim)' }} />
          <Label>CHANGE PASSWORD</Label>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            minLength={6}
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
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
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
          {pwMessage && (
            <p style={{ fontSize: 10, color: pwMessage.includes('updated') ? '#4ade80' : '#ff6b6b', letterSpacing: '0.04em' }}>{pwMessage}</p>
          )}
          <button
            onClick={handleChangePassword}
            disabled={passwordSaving}
            style={{
              alignSelf: 'flex-start',
              padding: '7px 14px',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 3,
              fontSize: 11,
              fontFamily: 'inherit',
              color: 'var(--text-secondary)',
              letterSpacing: '0.06em',
              cursor: passwordSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {passwordSaving && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
            UPDATE PASSWORD
          </button>
        </div>
      </div>

      {/* My Tasks */}
      {myTasks.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <Label>MY TASKS ({myTasks.length})</Label>
          </div>
          <div style={{ padding: '8px 20px' }}>
            {myTasks.slice(0, 8).map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: task.status === 'done' ? 'var(--text-dim)' : 'var(--text-primary)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                  {task.title}
                </span>
                <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Research */}
      {myResearch.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <Label>MY RESEARCH ({myResearch.length})</Label>
          </div>
          <div style={{ padding: '8px 20px' }}>
            {myResearch.slice(0, 8).map(entry => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>{entry.subnet_name}</span>
                <span style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{entry.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={signOut}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: 3,
          fontSize: 11,
          fontFamily: 'inherit',
          color: '#ff6b6b',
          letterSpacing: '0.06em',
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        <LogOut size={12} />
        SIGN OUT
      </button>
    </div>
  )
}
