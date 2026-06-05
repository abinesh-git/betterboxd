import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Clapperboard, BarChart2, CalendarDays, Globe } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/films', label: 'Films', icon: Clapperboard },
  { path: '/stats', label: 'Stats', icon: BarChart2 },
  { path: '/journey', label: 'Journey', icon: CalendarDays },
  { path: '/map', label: 'Map', icon: Globe },
]

export default function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around"
      style={{
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        height: 56,
        zIndex: 50,
      }}
    >
      {NAV_ITEMS.map(item => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 no-underline transition-colors"
            style={({ isActive }) => ({
              color: isActive ? 'var(--accent)' : 'var(--text-dim)',
            })}
          >
            <Icon size={20} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
