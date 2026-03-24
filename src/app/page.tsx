'use client'

import { useState } from 'react'
import Sidebar from '@/components/Navbar'
import DashboardTab from '@/components/dashboard/DashboardTab'
import ScheduleTab from '@/components/schedule/ScheduleTab'
import ResearchTab from '@/components/research/ResearchTab'
import WalletTab from '@/components/wallet/WalletTab'
import StarField from '@/components/StarField'

type Tab = 'dashboard' | 'schedule' | 'research' | 'wallet'

const TAB_LABELS: Record<Tab, string> = {
  dashboard: 'Dashboard',
  schedule: 'Schedule',
  research: 'Subnet Research',
  wallet: 'Wallet',
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="min-h-screen grid-bg" style={{ background: 'var(--bg)' }}>
      <StarField />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main
        className="relative z-10"
        style={{ marginLeft: 52, minHeight: '100vh', padding: '32px 32px 32px 40px' }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between mb-8"
          style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20 }}
        >
          <div>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                TAO Mining Project
              </span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-dim)', display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                {TAB_LABELS[activeTab]}
              </span>
            </div>
          </div>
          <div
            className="flex items-center gap-2"
            style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'inherit' }}
          >
            <span
              className="status-dot active"
              style={{ background: '#fff', color: '#fff' }}
            />
            <span style={{ letterSpacing: '0.06em' }}>LIVE</span>
          </div>
        </div>

        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'schedule' && <ScheduleTab />}
        {activeTab === 'research' && <ResearchTab />}
        {activeTab === 'wallet' && <WalletTab />}
      </main>
    </div>
  )
}
