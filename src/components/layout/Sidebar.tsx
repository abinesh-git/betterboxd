import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Clapperboard, BarChart2, CalendarDays,
  Users, Globe, Library, Layers, Bookmark, Columns2,
  Lightbulb, Compass, Sparkles, Upload, RefreshCw,
} from 'lucide-react'
import { reEnrichMissingFields } from '../../lib/tmdb'
import Logo from '../ui/Logo'

const NAV_GROUPS = [
  [
    { path: '/overview', label: 'Overview', icon: LayoutDashboard },
    { path: '/films', label: 'Films', icon: Clapperboard },
    { path: '/stats', label: 'Stats', icon: BarChart2 },
    { path: '/journey', label: 'Journey', icon: CalendarDays },
    { path: '/crew', label: 'Crew', icon: Users },
    { path: '/map', label: 'Map', icon: Globe },
  ],
  [
    { path: '/lists', label: 'Lists', icon: Library },
    { path: '/breakdown', label: 'Breakdown', icon: Layers },
    { path: '/watchlist', label: 'Watchlist', icon: Bookmark },
    { path: '/compare', label: 'Compare', icon: Columns2 },
  ],
  [
    { path: '/insights', label: 'Insights', icon: Lightbulb },
    { path: '/discover', label: 'Discover', icon: Compass },
    { path: '/wrapped', label: 'Wrapped', icon: Sparkles },
  ],
]

type UpdateState =
  | { status: 'idle' }
  | { status: 'running'; completed: number; total: number }
  | { status: 'done'; updated: number; failed: number }
  | { status: 'nothing' }

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })
  const navigate = useNavigate()

  async function handleUpdateFilmData() {
    if (update.status === 'running') return
    setUpdate({ status: 'running', completed: 0, total: 0 })
    await reEnrichMissingFields((completed, total, failed) => {
      if (total === 0) {
        setUpdate({ status: 'nothing' })
      } else {
        setUpdate({ status: 'running', completed, total })
        if (completed === total) {
          setUpdate({ status: 'done', updated: total - failed, failed })
        }
      }
    })
  }

  const updateLabel = (): string => {
    switch (update.status) {
      case 'running':
        return update.total > 0
          ? `${update.completed}/${update.total}`
          : 'checking...'
      case 'done':
        return `updated ${update.updated}`
      case 'nothing':
        return 'all up to date'
      default:
        return 'Update film data'
    }
  }

  return (
    <nav
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="hidden md:flex flex-col h-screen sticky top-0 flex-shrink-0 overflow-hidden"
      style={{
        width: expanded ? 220 : 56,
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        transition: 'width 0.2s ease',
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div className="flex items-center flex-shrink-0" style={{ height: 56, paddingLeft: 16, overflow: 'hidden' }}>
        <Logo size="sm" labelOpacity={expanded ? 1 : 0} />
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ padding: '8px 8px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && (
              <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '6px 0' }} />
            )}
            {group.map(item => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center no-underline mb-px transition-colors ${
                      isActive
                        ? 'text-[var(--accent)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`
                  }
                  style={({ isActive }) => ({
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isActive ? 'var(--accent-dim)' : 'transparent',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                  })}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    style={{
                      opacity: expanded ? 1 : 0,
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="flex-shrink-0" style={{ padding: '0 8px 16px' }}>
        <div style={{ height: 1, backgroundColor: 'var(--border)', marginBottom: 6 }} />

        {/* Update film data */}
        <button
          onClick={handleUpdateFilmData}
          disabled={update.status === 'running'}
          className="flex items-center w-full transition-colors"
          style={{
            gap: 10,
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            color: update.status === 'done' || update.status === 'nothing'
              ? 'var(--success)'
              : 'var(--text-dim)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: update.status === 'running' ? 'not-allowed' : 'pointer',
            marginBottom: 2,
          }}
          onMouseEnter={e => {
            if (update.status !== 'running') e.currentTarget.style.color = 'var(--text-secondary)'
          }}
          onMouseLeave={e => {
            if (update.status !== 'running' && update.status !== 'done' && update.status !== 'nothing') {
              e.currentTarget.style.color = 'var(--text-dim)'
            }
          }}
        >
          <RefreshCw
            size={14}
            className="flex-shrink-0"
            style={{
              animation: update.status === 'running' ? 'spin 1s linear infinite' : 'none',
            }}
          />
          <span
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
            style={{
              opacity: expanded ? 1 : 0,
              transition: 'opacity 0.15s ease',
              fontSize: 12,
            }}
          >
            {updateLabel()}
          </span>
        </button>

        {/* Re-import */}
        <button
          onClick={() => navigate('/upload')}
          className="flex items-center w-full transition-colors"
          style={{
            gap: 10,
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-dim)',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <Upload size={16} className="flex-shrink-0" />
          <span
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
            style={{
              opacity: expanded ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
          >
            Re-import
          </span>
        </button>
      </div>
    </nav>
  )
}
