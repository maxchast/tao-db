'use client'

import { useState } from 'react'
import { Hexagon, Loader2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error: err } = await signIn(email, password)
      if (err) setError(err)
    } else if (mode === 'signup') {
      if (!displayName.trim()) { setError('Display name is required'); setLoading(false); return }
      const { error: err } = await signUp(email, password, displayName.trim())
      if (err) setError(err)
      else setSuccess('Account created! You may need to verify your email.')
    } else {
      const { error: err } = await resetPassword(email)
      if (err) setError(err)
      else setSuccess('Password reset email sent. Check your inbox.')
    }

    setLoading(false)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setSuccess('')
  }

  return (
    <div
      className="grid-bg"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="fade-in"
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 32,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Hexagon
            size={36}
            strokeWidth={1.5}
            style={{ color: 'var(--text-primary)', margin: '0 auto 16px' }}
          />
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 4 }}>
            TAO Mining Project
          </h1>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {mode === 'login' ? 'SIGN IN' : mode === 'signup' ? 'CREATE ACCOUNT' : 'RESET PASSWORD'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-bright)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-bright)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />

            {mode !== 'forgot' && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 3,
                  padding: '10px 14px',
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-bright)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            )}
          </div>

          {error && (
            <p style={{ fontSize: 11, color: '#ff6b6b', marginTop: 12, letterSpacing: '0.02em' }}>
              {error}
            </p>
          )}

          {success && (
            <p style={{ fontSize: 11, color: '#4ade80', marginTop: 12, letterSpacing: '0.02em' }}>
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '10px 14px',
              background: 'var(--text-primary)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 3,
              fontSize: 11,
              fontFamily: 'inherit',
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? 'SIGN IN' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SEND RESET LINK'}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ marginTop: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mode === 'login' && (
            <>
              <button
                onClick={() => switchMode('forgot')}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.06em' }}
              >
                Forgot password?
              </button>
              <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
                No account?{' '}
                <button
                  onClick={() => switchMode('signup')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.04em', textDecoration: 'underline' }}
                >
                  Sign up
                </button>
              </p>
            </>
          )}

          {mode === 'signup' && (
            <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
              Already have an account?{' '}
              <button
                onClick={() => switchMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.04em', textDecoration: 'underline' }}
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <button
              onClick={() => switchMode('login')}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}
            >
              <ArrowLeft size={10} /> Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
