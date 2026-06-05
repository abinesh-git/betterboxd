import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { useAppStore } from '../../store'

const FILTER_TYPES = ['All', 'Features', 'Shorts', 'Miniseries']

function FilmTypeFilterBar() {
  const { filmTypeFilter, setFilmTypeFilter } = useAppStore()

  function toggle(type: string) {
    if (type === 'All') {
      setFilmTypeFilter(['All'])
      return
    }
    let next = filmTypeFilter.filter(t => t !== 'All')
    if (next.includes(type)) {
      next = next.filter(t => t !== type)
    } else {
      next = [...next, type]
    }
    setFilmTypeFilter(next.length === 0 ? ['All'] : next)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 24px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-dim)',
          marginRight: 6,
          fontFamily: 'Inter, sans-serif',
          textTransform: 'lowercase',
          letterSpacing: '0.02em',
        }}
      >
        showing
      </span>
      {FILTER_TYPES.map(type => {
        const active = filmTypeFilter.includes(type)
        return (
          <button
            key={type}
            onClick={() => toggle(type)}
            style={{
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--accent)' : 'var(--text-dim)',
              backgroundColor: active ? 'var(--accent-dim)' : 'transparent',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'color 0.12s ease, background-color 0.12s ease, border-color 0.12s ease',
            }}
          >
            {type}
          </button>
        )
      })}
    </div>
  )
}

export default function AppLayout() {
  return (
    <div className="flex" style={{ height: '100%', backgroundColor: 'var(--bg)' }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 56, minWidth: 0, overflowX: 'hidden' }}
      >
        <FilmTypeFilterBar />
        <div className="md:pb-0">
          <Outlet />
        </div>
        {/* TMDB attribution — required by their terms */}
        <div
          style={{
            padding: '12px 24px',
            fontSize: 11,
            color: 'var(--text-dim)',
            borderTop: '1px solid var(--border)',
            marginTop: 16,
          }}
        >
          Film data from TMDB
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
