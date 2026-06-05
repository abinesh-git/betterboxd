import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Clapperboard, BarChart2, CalendarDays,
  Users, Globe, Library, Tag, Bookmark, Columns2,
  Lightbulb, Compass, Sparkles, Upload,
} from 'lucide-react'

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
    { path: '/tags', label: 'Tags', icon: Tag },
    { path: '/watchlist', label: 'Watchlist', icon: Bookmark },
    { path: '/compare', label: 'Compare', icon: Columns2 },
  ],
  [
    { path: '/insights', label: 'Insights', icon: Lightbulb },
    { path: '/discover', label: 'Discover', icon: Compass },
    { path: '/wrapped', label: 'Wrapped', icon: Sparkles },
  ],
]

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

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
      <div className="flex items-center flex-shrink-0" style={{ height: 56, paddingLeft: 16 }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 24,
            height: 24,
            backgroundColor: 'var(--accent)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          <span style={{
            color: '#0d0f11',
            fontSize: 11,
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 700,
            lineHeight: 1,
          }}>
            C
          </span>
        </div>
        <span
          className="whitespace-nowrap overflow-hidden"
          style={{
            marginLeft: 10,
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--text-primary)',
            opacity: expanded ? 1 : 0,
            transition: 'opacity 0.15s ease',
          }}
        >
          Cinestamp
        </span>
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

      {/* Re-import */}
      <div className="flex-shrink-0" style={{ padding: '0 8px 16px' }}>
        <div style={{ height: 1, backgroundColor: 'var(--border)', marginBottom: 6 }} />
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
