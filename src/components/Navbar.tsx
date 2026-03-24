'use client'

import { useTheme } from './ThemeProvider'
import { Sun, Moon, CalendarDays, FlaskConical, Hexagon, LayoutDashboard, Wallet, Bot, UserCircle } from 'lucide-react'
export type Tab = 'dashboard' | 'schedule' | 'research' | 'wallet' | 'agents' | 'profile'

interface SidebarProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
}

const NAV_ITEMS = [
  { id: 'dashboard' as Tab, icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'schedule' as Tab, icon: CalendarDays, label: 'Schedule' },
  { id: 'research' as Tab, icon: FlaskConical, label: 'Subnet Research' },
  { id: 'wallet' as Tab, icon: Wallet, label: 'Wallet' },
  { id: 'agents' as Tab, icon: Bot, label: 'Agents' },
]

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { theme, toggle } = useTheme()

  return (
    <aside
      className="fixed left-0 top-0 h-full z-50 flex flex-col items-center py-5 gap-2"
      style={{
        width: 52,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo mark */}
      <div className="mb-4 flex items-center justify-center w-8 h-8">
        <Hexagon
          size={22}
          strokeWidth={1.5}
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />

      {/* Nav icons */}
      <div className="flex flex-col gap-1 flex-1 w-full px-2 mt-2">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            title={label}
            className="group relative flex items-center justify-center w-full rounded"
            style={{
              height: 36,
              background: activeTab === id ? 'var(--surface-2)' : 'transparent',
              border: activeTab === id ? '1px solid var(--border-bright)' : '1px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon
              size={16}
              strokeWidth={activeTab === id ? 2 : 1.5}
              style={{
                color: activeTab === id ? 'var(--text-primary)' : 'var(--text-dim)',
                transition: 'color 0.15s ease',
              }}
            />
            {/* Tooltip */}
            <span
              className="absolute left-full ml-2 px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none rounded"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontFamily: 'inherit',
                transition: 'opacity 0.15s ease',
              }}
            >
              {label}
            </span>

            {/* Active indicator */}
            {activeTab === id && (
              <span
                className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
                style={{ width: 2, height: 16, background: 'var(--text-primary)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Bottom: profile + theme toggle */}
      <div style={{ width: '100%', height: 1, background: 'var(--border)' }} />
      <button
        onClick={() => setActiveTab('profile')}
        title="Profile"
        className="mt-2 flex items-center justify-center rounded relative"
        style={{
          width: 36,
          height: 36,
          border: activeTab === 'profile' ? '1px solid var(--border-bright)' : '1px solid var(--border)',
          background: activeTab === 'profile' ? 'var(--surface-2)' : 'transparent',
          color: activeTab === 'profile' ? 'var(--text-primary)' : 'var(--text-dim)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          if (activeTab !== 'profile') {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'
          }
        }}
      >
        <UserCircle size={16} strokeWidth={1.5} />
        {activeTab === 'profile' && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
            style={{ width: 2, height: 16, background: 'var(--text-primary)' }}
          />
        )}
      </button>
      <button
        onClick={toggle}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        className="mt-1 flex items-center justify-center rounded"
        style={{
          width: 36,
          height: 36,
          border: '1px solid var(--border)',
          background: 'transparent',
          color: 'var(--text-dim)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'
        }}
      >
        {theme === 'dark' ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
      </button>
    </aside>
  )
}
