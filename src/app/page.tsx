'use client'

import { useState } from 'react'
import Sidebar from '@/components/Navbar'
import DashboardTab from '@/components/dashboard/DashboardTab'
import ScheduleTab from '@/components/schedule/ScheduleTab'
import ResearchTab from '@/components/research/ResearchTab'
import WalletTab from '@/components/wallet/WalletTab'
import AgentsTab from '@/components/agents/AgentsTab'
import GrayDashTab from '@/components/gray-dash/GrayDashTab'
import ProfileTab from '@/components/profile/ProfileTab'
import LoginScreen from '@/components/auth/LoginScreen'
import StarField from '@/components/StarField'
import { useAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

import type { Tab } from '@/components/Navbar'

const TAB_LABELS: Record<Tab, string> = {
  dashboard: 'Dashboard',
  schedule: 'Schedule',
  research: 'Subnet Research',
  wallet: 'Wallet',
  agents: 'Agents',
  grayDash: 'Gray Dash',
  profile: 'Profile',
}

export default function Home() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  if (loading) {
    return (
      <div className="grid-bg" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: 'var(--text-dim)', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

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
        {activeTab === 'agents' && <AgentsTab />}
        {activeTab === 'grayDash' && <GrayDashTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </main>
    </div>
  )
}
