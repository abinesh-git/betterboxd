import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { getAllFilms } from '../lib/stats'
import type { Film } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'directors' | 'cast' | 'cinematographers' | 'composers' | 'screenwriters' | 'editors'

interface CrewPerson {
  name: string
  filmCount: number
  avgRating: number | null
  seenFilms: Film[]
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'directors',        label: 'Directors' },
  { key: 'cast',             label: 'Cast' },
  { key: 'cinematographers', label: 'Cinematographers' },
  { key: 'composers',        label: 'Composers' },
  { key: 'screenwriters',    label: 'Writers' },
  { key: 'editors',          label: 'Editors' },
]

function getNames(film: Film, tab: TabKey): string[] {
  const t = film.tmdbData
  if (!t) return []
  switch (tab) {
    case 'directors':        return t.directors ?? []
    case 'cast':             return t.cast ?? []
    case 'cinematographers': return t.cinematographers ?? []
    case 'composers':        return t.composers ?? []
    case 'screenwriters':    return t.screenwriters ?? []
    case 'editors':          return t.editors ?? []
  }
}

function buildRanking(films: Film[], tab: TabKey): CrewPerson[] {
  const map = new Map<string, Film[]>()
  for (const film of films) {
    for (const name of getNames(film, tab)) {
      if (!name) continue
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(film)
    }
  }
  return Array.from(map.entries())
    .map(([name, seen]) => {
      const rated = seen.filter(f => f.rating != null)
      return {
        name,
        filmCount: seen.length,
        avgRating: rated.length >= 1 ? rated.reduce((s, f) => s + f.rating!, 0) / rated.length : null,
        seenFilms: seen,
      }
    })
    .sort((a, b) => b.filmCount - a.filmCount || (b.avgRating ?? 0) - (a.avgRating ?? 0))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RankedRow({
  rank, person, maxCount, onClick,
}: {
  rank: number
  person: CrewPerson
  maxCount: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 16px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-raised)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <span
        style={{
          width: 24,
          flexShrink: 0,
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-dim)',
          textAlign: 'right',
        }}
      >
        {rank}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 14,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {person.name}
      </span>
      <div
        style={{
          width: 120,
          flexShrink: 0,
          height: 4,
          backgroundColor: 'var(--surface-raised)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(person.filmCount / maxCount) * 100}%`,
            backgroundColor: 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span
        style={{
          width: 52,
          flexShrink: 0,
          textAlign: 'right',
          fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-secondary)',
        }}
      >
        {person.filmCount}
      </span>
      {person.avgRating != null ? (
        <span
          style={{
            width: 42,
            flexShrink: 0,
            textAlign: 'right',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--accent)',
          }}
        >
          {person.avgRating.toFixed(1)}★
        </span>
      ) : (
        <span style={{ width: 42, flexShrink: 0 }} />
      )}
    </button>
  )
}

function FilmPill({ film }: { film: Film }) {
  const poster = film.tmdbData?.posterPath
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {poster ? (
        <img
          src={`https://image.tmdb.org/t/p/w92${poster}`}
          alt=""
          style={{ width: 28, height: 42, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
        />
      ) : (
        <div
          style={{
            width: 28,
            height: 42,
            borderRadius: 3,
            backgroundColor: 'var(--surface-raised)',
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {film.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{film.year}</div>
      </div>
      {film.rating != null && (
        <span
          style={{
            flexShrink: 0,
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--accent)',
          }}
        >
          {film.rating.toFixed(1)}★
        </span>
      )}
    </div>
  )
}

function PersonDrawer({
  person,
  allFilms,
  tab,
  onClose,
}: {
  person: CrewPerson
  allFilms: Film[]
  tab: TabKey
  onClose: () => void
}) {
  const seen = useMemo(
    () => [...person.seenFilms].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [person]
  )

  const blindSpots = useMemo(() => {
    const seenUris = new Set(person.seenFilms.map(f => f.uri))
    return allFilms
      .filter(f => !seenUris.has(f.uri) && getNames(f, tab).includes(person.name))
      .sort((a, b) => (b.tmdbData?.tmdbRating ?? 0) - (a.tmdbData?.tmdbRating ?? 0))
      .slice(0, 10)
  }, [person, allFilms, tab])

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 40,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          backgroundColor: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 20px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--surface)',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'Clash Display, sans-serif',
                fontWeight: 600,
                fontSize: 16,
                color: 'var(--text-primary)',
              }}
            >
              {person.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              {person.filmCount} {person.filmCount === 1 ? 'film' : 'films'} seen
              {person.avgRating != null && ` · avg ${person.avgRating.toFixed(1)}★`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim)',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Seen */}
        <div style={{ padding: '16px 20px' }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'Clash Display, sans-serif',
              fontWeight: 600,
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 12,
            }}
          >
            Seen ({seen.length})
          </div>
          {seen.map(f => (
            <FilmPill key={f.uri} film={f} />
          ))}
        </div>

        {/* Blind spots */}
        {blindSpots.length > 0 && (
          <div style={{ padding: '0 20px 24px' }}>
            <div
              style={{
                fontSize: 11,
                fontFamily: 'Clash Display, sans-serif',
                fontWeight: 600,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 12,
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
              }}
            >
              Blind spots
            </div>
            {blindSpots.map(f => (
              <FilmPill key={f.uri} film={f} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CrewPage() {
  const [tab, setTab] = useState<TabKey>('directors')
  const [allFilms, setAllFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CrewPerson | null>(null)

  useEffect(() => {
    getAllFilms().then(films => {
      setAllFilms(films)
      setLoading(false)
    })
  }, [])

  const ranking = useMemo(() => buildRanking(allFilms, tab), [allFilms, tab])
  const maxCount = Math.max(...ranking.map(p => p.filmCount), 1)

  if (loading) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
          loading...
        </span>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 0 40px', maxWidth: 900 }}>
      <div style={{ padding: '0 24px' }}>
        <h1
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 22,
            color: 'var(--text-primary)',
            marginBottom: 24,
          }}
        >
          Crew
        </h1>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            borderBottom: '1px solid var(--border)',
            overflowX: 'auto',
          }}
        >
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(null) }}
              style={{
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 500,
                color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginBottom: -1,
                transition: 'color 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ranked list */}
      <div
        style={{
          marginTop: 20,
          marginLeft: 24,
          marginRight: 24,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ width: 24, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Name
          </span>
          <span style={{ width: 120, flexShrink: 0, fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Films
          </span>
          <span style={{ width: 52, flexShrink: 0, textAlign: 'right', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Count
          </span>
          <span style={{ width: 42, flexShrink: 0, textAlign: 'right', fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Avg
          </span>
        </div>

        {ranking.length === 0 ? (
          <div style={{ padding: '24px 16px', color: 'var(--text-dim)', fontSize: 13 }}>
            No data yet — enrich your films to see crew.
          </div>
        ) : (
          ranking.slice(0, 100).map((person, i) => (
            <RankedRow
              key={person.name}
              rank={i + 1}
              person={person}
              maxCount={maxCount}
              onClick={() => setSelected(person)}
            />
          ))
        )}
      </div>

      {ranking.length > 100 && (
        <p style={{ padding: '12px 24px 0', fontSize: 12, color: 'var(--text-dim)' }}>
          Showing top 100 of {ranking.length}
        </p>
      )}

      {selected && (
        <PersonDrawer
          person={selected}
          allFilms={allFilms}
          tab={tab}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
