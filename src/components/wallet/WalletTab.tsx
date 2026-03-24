'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, X, Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'
import { supabase, type WalletEntry } from '@/lib/supabase'

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
        ...props.style,
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

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string
  value: string
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
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          {label}
        </span>
        <Icon size={14} style={{ color: accent || 'var(--text-dim)' }} />
      </div>
      <span style={{ fontSize: 24, fontWeight: 700, color: accent || 'var(--text-primary)', letterSpacing: '-0.03em' }}>
        {value}
      </span>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, letterSpacing: '0.04em' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

const emptyForm = {
  wallet_name: '',
  coldkey: '',
  hotkey: '',
  subnet_id: '',
  stake: 0,
  daily_earnings: 0,
  notes: '',
}

export default function WalletTab() {
  const [entries, setEntries] = useState<WalletEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [taoPrice, setTaoPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number | null>(null)

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from('wallet_entries')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setEntries(data)
    setLoading(false)
  }, [])

  async function fetchTaoPrice() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bittensor&vs_currencies=usd&include_24hr_change=true')
      const data = await res.json()
      if (data.bittensor) {
        setTaoPrice(data.bittensor.usd)
        setPriceChange(data.bittensor.usd_24h_change)
      }
    } catch {
      // price fetch failed silently
    }
  }

  useEffect(() => {
    fetchEntries()
    fetchTaoPrice()
    const channel = supabase
      .channel('wallet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_entries' }, fetchEntries)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchEntries])

  async function saveEntry() {
    if (!form.wallet_name.trim()) return
    await supabase.from('wallet_entries').insert([{ ...form, subnet_id: form.subnet_id || null }])
    setForm(emptyForm)
    setShowForm(false)
    fetchEntries()
  }

  async function deleteEntry(id: string) {
    await supabase.from('wallet_entries').delete().eq('id', id)
    fetchEntries()
  }

  const totalStake = entries.reduce((sum, e) => sum + (e.stake || 0), 0)
  const totalDaily = entries.reduce((sum, e) => sum + (e.daily_earnings || 0), 0)
  const totalUsd = taoPrice ? totalStake * taoPrice : null

  return (
    <div className="fade-in" style={{ maxWidth: 900 }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Wallet Overview
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, letterSpacing: '0.04em' }}>
            {entries.length} wallets tracked · TAO mining earnings
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchTaoPrice}
            title="Refresh price"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 12px',
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 3,
              fontSize: 11, fontFamily: 'inherit',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={() => { setForm(emptyForm); setShowForm(true) }}
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
            ADD WALLET
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        <StatCard
          label="TAO Price"
          value={taoPrice ? `$${taoPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          sub={priceChange !== null ? `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}% 24h` : undefined}
          icon={priceChange !== null && priceChange >= 0 ? ArrowUpRight : ArrowDownRight}
          accent={priceChange !== null ? (priceChange >= 0 ? '#4ade80' : '#ff6b6b') : undefined}
        />
        <StatCard
          label="Total Stake"
          value={`${totalStake.toLocaleString(undefined, { maximumFractionDigits: 4 })} τ`}
          sub={totalUsd ? `≈ $${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : undefined}
          icon={Wallet}
        />
        <StatCard
          label="Daily Earnings"
          value={`${totalDaily.toLocaleString(undefined, { maximumFractionDigits: 4 })} τ`}
          sub={taoPrice ? `≈ $${(totalDaily * taoPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}/day` : undefined}
          icon={TrendingUp}
        />
        <StatCard
          label="Monthly Est."
          value={`${(totalDaily * 30).toLocaleString(undefined, { maximumFractionDigits: 2 })} τ`}
          sub={taoPrice ? `≈ $${(totalDaily * 30 * taoPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}/mo` : undefined}
          icon={TrendingUp}
        />
      </div>

      {/* Form */}
      {showForm && (
        <div
          className="fade-in mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>NEW WALLET</Label>
            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input placeholder="Wallet name *" value={form.wallet_name} onChange={e => setForm(f => ({ ...f, wallet_name: e.target.value }))} />
            <Input placeholder="Subnet ID" value={form.subnet_id} onChange={e => setForm(f => ({ ...f, subnet_id: e.target.value }))} />
            <Input placeholder="Coldkey address" value={form.coldkey} onChange={e => setForm(f => ({ ...f, coldkey: e.target.value }))} />
            <Input placeholder="Hotkey address" value={form.hotkey} onChange={e => setForm(f => ({ ...f, hotkey: e.target.value }))} />
            <Input type="number" step="any" placeholder="Current stake (τ)" value={form.stake || ''} onChange={e => setForm(f => ({ ...f, stake: parseFloat(e.target.value) || 0 }))} />
            <Input type="number" step="any" placeholder="Daily earnings (τ)" value={form.daily_earnings || ''} onChange={e => setForm(f => ({ ...f, daily_earnings: parseFloat(e.target.value) || 0 }))} />
            <div style={{ gridColumn: '1 / -1' }}>
              <Input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)}
              style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.06em' }}>
              CANCEL
            </button>
            <button onClick={saveEntry}
              style={{ padding: '7px 14px', background: 'var(--text-primary)', color: 'var(--bg)', border: 'none', borderRadius: 3, fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', fontWeight: 700, letterSpacing: '0.06em' }}>
              ADD
            </button>
          </div>
        </div>
      )}

      {/* Wallet List */}
      {loading ? (
        <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>LOADING...</p>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Wallet size={24} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>NO WALLETS ADDED</p>
          <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, letterSpacing: '0.04em' }}>Add a wallet to start tracking earnings</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px 40px', gap: 16, padding: '0 16px 8px', alignItems: 'center' }}>
            <Label>WALLET</Label>
            <Label>SUBNET</Label>
            <Label>STAKE</Label>
            <Label>DAILY</Label>
            <span />
          </div>

          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="group"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 100px 100px 40px',
                gap: 16,
                padding: '14px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                alignItems: 'center',
                animation: `fadeInUp 0.2s ease ${i * 0.03}s both`,
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>
                  {entry.wallet_name}
                </span>
                {entry.coldkey && (
                  <p style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.coldkey.slice(0, 8)}...{entry.coldkey.slice(-6)}
                  </p>
                )}
                {entry.notes && (
                  <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{entry.notes}</p>
                )}
              </div>

              <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                {entry.subnet_id || '—'}
              </span>

              <div>
                <span style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                  {entry.stake?.toLocaleString(undefined, { maximumFractionDigits: 4 })} τ
                </span>
                {taoPrice && entry.stake > 0 && (
                  <p style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>
                    ${(entry.stake * taoPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div>
                <span style={{ fontSize: 12, color: entry.daily_earnings > 0 ? '#4ade80' : 'var(--text-secondary)' }}>
                  {entry.daily_earnings > 0 ? '+' : ''}{entry.daily_earnings?.toLocaleString(undefined, { maximumFractionDigits: 4 })} τ
                </span>
                {taoPrice && entry.daily_earnings > 0 && (
                  <p style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>
                    ${(entry.daily_earnings * taoPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}/day
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 4, opacity: 0 }} className="group-hover:opacity-100">
                <button onClick={() => deleteEntry(entry.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 2 }}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
