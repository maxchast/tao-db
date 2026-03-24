'use client'

import type { ReactNode } from 'react'
import { useGrayDashApi } from '@/hooks/useGrayDashApi'
import { grayDashUsesBrowserDirect } from '@/lib/grayDashApi'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// ── Types (Bit FastAPI shapes) ─────────────────────────────

type MinerState = {
  status?: string
  uid?: number | string
  subnet_netuid?: number | string
  uptime_seconds?: number
  timestamp?: number
}

type Overview = {
  miner_state?: MinerState
  stats?: {
    total_events?: number
    success_rate?: number
    avg_latency_ms?: number
    failed_events?: number
  }
  latest_run?: {
    run_id?: number | string
    miner_version?: string
    start_time?: number
    config_json?: string
  }
}

type EventRow = {
  id?: number | string
  timestamp: number
  event_type?: string
  details_json?: string
  latency_ms?: number
  success?: boolean
}

type EventsResponse = { events?: EventRow[] }

type HardwareMetric = {
  timestamp: number
  gpu_util: number
  gpu_vram_used_mb: number
  gpu_vram_total_mb: number
  cpu_util: number
  ram_used_mb: number
  ram_total_mb: number
  gpu_temp_c?: number
}

type HardwareResponse = { metrics?: HardwareMetric[] }

type RewardSnapshot = {
  timestamp: number
  incentive?: number
  emissions?: number
  rank?: number
  trust?: number
  consensus?: number
  stake?: number
}

type RewardsResponse = { snapshots?: RewardSnapshot[] }

type ChartPoint = Record<string, string | number | undefined>

// ── Helpers ─────────────────────────────────────────────────

function uptime(s?: number) {
  if (s == null || s <= 0) return '0s'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${Math.floor(s % 60)}s`
}

function ago(ts?: number) {
  if (ts == null) return '--'
  const d = Date.now() / 1000 - ts
  if (d < 60) return `${Math.floor(d)}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  return `${Math.floor(d / 3600)}h ago`
}

function timeLabel(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Main ────────────────────────────────────────────────────

export default function GrayDashTab() {
  const { data: ov, error: eOv } = useGrayDashApi<Overview>('overview', 4000)
  const { data: ev, error: eEv } = useGrayDashApi<EventsResponse>('events?limit=50', 4000)
  const { data: hw, error: eHw } = useGrayDashApi<HardwareResponse>('hardware?limit=120', 6000)
  const { data: rw, error: eRw } = useGrayDashApi<RewardsResponse>('rewards?limit=60', 8000)

  const apiError = eOv || eEv || eHw || eRw

  const state = ov?.miner_state
  const stats = ov?.stats ?? {}
  const run = ov?.latest_run
  const events = ev?.events ?? []
  const hardware = (hw?.metrics ?? []).map(m => ({ ...m, t: timeLabel(m.timestamp) })) as ChartPoint[]
  const snapshots = (rw?.snapshots ?? []).map(s => ({ ...s, t: timeLabel(s.timestamp) })) as ChartPoint[]
  const latestHw = hardware.length > 0 ? (hardware[hardware.length - 1] as unknown as HardwareMetric & { t: string }) : null
  const latestSnap = snapshots.length > 0 ? (snapshots[snapshots.length - 1] as unknown as RewardSnapshot) : null
  const isLive = state?.status === 'running'
  const isMock =
    run?.config_json?.includes('"mock": true') ||
    run?.config_json?.includes('"mock":true')

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {apiError && (
        <div
          style={{
            marginBottom: 24,
            padding: '14px 18px',
            borderRadius: 4,
            border: '1px solid var(--border-bright)',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Gray Dash API:</strong> {apiError}
          <div style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: 11 }}>
            {grayDashUsesBrowserDirect() ? (
              <>
                Browser-direct mode: ensure <code style={{ color: 'var(--text-secondary)' }}>NEXT_PUBLIC_GRAY_DASH_ORIGIN</code> is
                correct, the miner API is up, and Bit FastAPI CORS includes this site&apos;s origin.
              </>
            ) : (
              <>
                <strong style={{ color: 'var(--text-secondary)' }}>Local:</strong>{' '}
                <code style={{ color: 'var(--text-secondary)' }}>GRAY_DASH_API_URL=http://127.0.0.1:8080</code> in{' '}
                <code style={{ color: 'var(--text-secondary)' }}>.env.local</code>.
                <br />
                <strong style={{ color: 'var(--text-secondary)' }}>Railway / cloud:</strong> set{' '}
                <code style={{ color: 'var(--text-secondary)' }}>NEXT_PUBLIC_GRAY_DASH_ORIGIN</code> to your public tunnel URL
                (tunnel to Bit on :8080), redeploy, and add this app&apos;s URL to Bit{' '}
                <code style={{ color: 'var(--text-secondary)' }}>allow_origins</code>.
              </>
            )}
          </div>
        </div>
      )}

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
            Miner telemetry
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: 0 }}>
            Gray Dash
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
          {isMock && (
            <span
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid var(--dash-warn)',
                color: 'var(--dash-warn)',
                letterSpacing: '0.08em',
                fontSize: 10,
                textTransform: 'uppercase',
              }}
            >
              Mock
            </span>
          )}
          {!isMock && state && (
            <span
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid var(--border-bright)',
                color: 'var(--text-secondary)',
                letterSpacing: '0.08em',
                fontSize: 10,
                textTransform: 'uppercase',
              }}
            >
              Testnet
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isLive ? 'var(--dash-live)' : 'var(--dash-offline)',
                boxShadow: isLive ? '0 0 12px var(--dash-live)' : 'none',
              }}
            />
            <span style={{ fontWeight: 600, color: isLive ? 'var(--dash-live)' : 'var(--dash-offline)' }}>
              {isLive ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Stat label="UID" value={state?.uid ?? '--'} accent />
        <Stat label="Subnet" value={state?.subnet_netuid ?? '--'} />
        <Stat label="Uptime" value={uptime(state?.uptime_seconds)} />
        <Stat label="Heartbeat" value={ago(state?.timestamp)} />
        <Stat label="Requests" value={stats.total_events ?? 0} />
        <Stat
          label="Success"
          value={stats.success_rate != null ? `${stats.success_rate.toFixed(1)}%` : '--'}
          color={
            stats.success_rate == null
              ? undefined
              : stats.success_rate >= 95
                ? 'var(--dash-live)'
                : stats.success_rate >= 80
                  ? 'var(--dash-warn)'
                  : 'var(--dash-offline)'
          }
        />
        <Stat
          label="Avg latency"
          value={stats.avg_latency_ms != null ? `${stats.avg_latency_ms.toFixed(0)}ms` : '--'}
        />
        <Stat
          label="Errors"
          value={stats.failed_events ?? 0}
          color={(stats.failed_events ?? 0) > 0 ? 'var(--dash-offline)' : undefined}
        />
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <Stat label="Incentive" value={latestSnap?.incentive != null ? latestSnap.incentive.toFixed(6) : '0'} />
        <Stat label="Emissions" value={latestSnap?.emissions != null ? latestSnap.emissions.toFixed(6) : '0'} />
        <Stat label="Rank" value={latestSnap?.rank != null ? latestSnap.rank.toFixed(6) : '0'} />
        <Stat label="Trust" value={latestSnap?.trust != null ? latestSnap.trust.toFixed(4) : '0'} />
        <Stat label="Consensus" value={latestSnap?.consensus != null ? latestSnap.consensus.toFixed(4) : '0'} />
        <Stat label="Stake" value={latestSnap?.stake != null ? latestSnap.stake.toFixed(2) : '0'} />
      </section>

      <section style={{ marginBottom: 28 }}>
        <Panel label="Hardware">
          {latestHw ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 24,
                  padding: '24px 20px',
                }}
              >
                <HwGauge
                  label="GPU"
                  value={`${latestHw.gpu_util.toFixed(0)}%`}
                  pct={latestHw.gpu_util}
                  color="var(--dash-chart-gpu)"
                />
                <HwGauge
                  label="VRAM"
                  value={`${(latestHw.gpu_vram_used_mb / 1024).toFixed(1)} / ${(latestHw.gpu_vram_total_mb / 1024).toFixed(0)}G`}
                  pct={(latestHw.gpu_vram_used_mb / latestHw.gpu_vram_total_mb) * 100}
                  color="var(--dash-chart-trust)"
                />
                <HwGauge
                  label="CPU"
                  value={`${latestHw.cpu_util.toFixed(0)}%`}
                  pct={latestHw.cpu_util}
                  color="var(--dash-live)"
                />
                <HwGauge
                  label="RAM"
                  value={`${(latestHw.ram_used_mb / 1024).toFixed(1)} / ${(latestHw.ram_total_mb / 1024).toFixed(0)}G`}
                  pct={(latestHw.ram_used_mb / latestHw.ram_total_mb) * 100}
                  color="var(--dash-warn)"
                />
              </div>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', paddingBottom: 16 }}>
                GPU temp: {latestHw.gpu_temp_c != null ? `${latestHw.gpu_temp_c.toFixed(0)}°C` : '--'}
              </div>
            </>
          ) : (
            <Empty text="No hardware data" />
          )}
        </Panel>
      </section>

      <section style={{ marginBottom: 28 }}>
        <Panel label="Live feed" count={events.length}>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {events.length === 0 ? (
              <Empty text="No events yet. Waiting for validator requests…" />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-dim)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <th style={{ textAlign: 'left', padding: '12px 16px', width: 120 }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '12px 12px' }}>Event</th>
                    <th style={{ textAlign: 'left', padding: '12px 12px', width: 100 }}>Latency</th>
                    <th style={{ textAlign: 'left', padding: '12px 12px', width: 56 }}>OK</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr
                      key={e.id ?? i}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={el => {
                        el.currentTarget.style.background = 'var(--surface-2)'
                      }}
                      onMouseLeave={el => {
                        el.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <td style={{ padding: '10px 16px', color: 'var(--text-dim)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(e.timestamp * 1000).toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>
                        <EventTag type={e.event_type} details={e.details_json} />
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: 12 }}>
                        {e.latency_ms != null && e.latency_ms > 0 ? `${e.latency_ms.toFixed(0)}ms` : '--'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 16 }}>
                        {e.success ? (
                          <span style={{ color: 'var(--dash-live)' }}>✓</span>
                        ) : (
                          <span style={{ color: 'var(--dash-offline)' }}>✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <Panel label="GPU utilization">
          <MiniChart data={hardware} dataKey="gpu_util" strokeVar="var(--dash-chart-gpu)" />
        </Panel>
        <Panel label="Incentive">
          <MiniChart data={snapshots} dataKey="incentive" strokeVar="var(--dash-chart-inc)" />
        </Panel>
        <Panel label="Trust">
          <MiniChart data={snapshots} dataKey="trust" strokeVar="var(--dash-chart-trust)" />
        </Panel>
      </section>

      <footer
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--text-dim)',
          padding: '24px 0',
          borderTop: '1px solid var(--border)',
        }}
      >
        {run && (
          <span>
            Run {run.run_id} · v{run.miner_version} · {new Date((run.start_time ?? 0) * 1000).toLocaleString()}
          </span>
        )}
      </footer>
    </div>
  )
}

// ── Pieces ──────────────────────────────────────────────────

function Stat({
  label,
  value,
  accent,
  color,
}: {
  label: string
  value: string | number
  accent?: boolean
  color?: string
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        padding: '14px 16px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {accent && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--text-primary), transparent)',
            opacity: 0.35,
          }}
        />
      )}
      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: color ?? (accent ? 'var(--text-primary)' : 'var(--text-primary)'),
        }}
      >
        {value}
      </div>
    </div>
  )
}

function Panel({ label, count, children }: { label: string; count?: number; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>{label}</span>
        {count !== undefined && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{count}</span>}
      </div>
      {children}
    </div>
  )
}

const EVENT_COLORS: Record<string, string> = {
  request_received: 'var(--text-primary)',
  response_sent: 'var(--dash-live)',
  error: 'var(--dash-offline)',
  timeout: 'var(--dash-warn)',
  miner_started: 'var(--text-primary)',
  miner_stopped: 'var(--text-dim)',
  custom: 'var(--dash-chart-trust)',
}

function EventTag({ type, details }: { type?: string; details?: string }) {
  let parsed: Record<string, string> = {}
  try {
    parsed = JSON.parse(details || '{}') as Record<string, string>
  } catch {
    parsed = {}
  }
  const label = type?.replace(/_/g, ' ') || 'unknown'
  const extra = parsed.synapse_type || parsed.caller_hotkey?.slice(0, 8) || parsed.context || ''
  const c = EVENT_COLORS[type ?? ''] ?? 'var(--text-secondary)'

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 600, color: c }}>{label}</span>
      {extra ? (
        <span style={{ color: 'var(--text-dim)', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {extra}
        </span>
      ) : null}
    </span>
  )
}

function HwGauge({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  const clampPct = Math.min(100, Math.max(0, pct))
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>{label}</div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 6,
          background: 'var(--surface-2)',
          borderRadius: 3,
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clampPct}%`,
            borderRadius: 3,
            background: color,
            transition: 'width 0.5s ease',
            boxShadow: `0 0 8px color-mix(in srgb, ${color} 40%, transparent)`,
          }}
        />
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function MiniChart({ data, dataKey, strokeVar }: { data: ChartPoint[]; dataKey: string; strokeVar: string }) {
  if (!data.length) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-dim)' }}>
        Waiting for data
      </div>
    )
  }
  return (
    <div style={{ padding: 12 }}>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip
            contentStyle={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontSize: 11,
              color: 'var(--text-primary)',
            }}
            labelStyle={{ color: 'var(--text-dim)' }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={strokeVar}
            fill={strokeVar}
            fillOpacity={0.12}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-dim)' }}>{text}</div>
  )
}
