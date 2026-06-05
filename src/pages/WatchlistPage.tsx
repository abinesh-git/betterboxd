import { useEffect, useMemo, useState } from 'react'
import { getAllFilms } from '../lib/stats'
import type { Film } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

type SortKey = 'dateAdded' | 'tmdbRating' | 'releaseYear'

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function topGenres(films: Film[], n = 8): { name: string; count: number }[] {
  const map = new Map<string, number>()
  for (const f of films)
    for (const g of f.tmdbData?.genres ?? [])
      map.set(g, (map.get(g) ?? 0) + 1)
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '14px 18px',
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
        {label}
      </div>
    </div>
  )
}

function GenreColumn({ title, genres, max }: { title: string; genres: { name: string; count: number }[]; max: number }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 12 }}>{title}</div>
      {genres.map(g => (
        <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
          <div style={{ width: 96, flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{g.name}</div>
          <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-raised)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: `${(g.count / max) * 100}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: 2 }} />
          </div>
          <div style={{ width: 24, flexShrink: 0, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', textAlign: 'right' }}>{g.count}</div>
        </div>
      ))}
    </div>
  )
}

// ── Film sort + display ───────────────────────────────────────────────────────

function sortWatchlistFilms(films: Film[], by: SortKey): Film[] {
  return [...films].sort((a, b) => {
    switch (by) {
      case 'dateAdded': {
        const da = a.watchlistDate ?? ''
        const db = b.watchlistDate ?? ''
        return da < db ? 1 : da > db ? -1 : 0
      }
      case 'tmdbRating':
        return (b.tmdbData?.tmdbRating ?? 0) - (a.tmdbData?.tmdbRating ?? 0)
      case 'releaseYear':
        return b.year - a.year
    }
  })
}

function FilmRow({ film }: { film: Film }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      {film.tmdbData?.posterPath ? (
        <img
          src={`https://image.tmdb.org/t/p/w92${film.tmdbData.posterPath}`}
          alt=""
          style={{ width: 28, height: 42, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 28, height: 42, backgroundColor: 'var(--surface-raised)', borderRadius: 3, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {film.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {film.year}{film.tmdbData?.genres?.[0] ? ` · ${film.tmdbData.genres[0]}` : ''}
        </div>
      </div>
      {film.tmdbData?.runtime != null && (
        <div style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          {Math.floor(film.tmdbData.runtime / 60)}h{film.tmdbData.runtime % 60 > 0 ? ` ${film.tmdbData.runtime % 60}m` : ''}
        </div>
      )}
      {film.tmdbData?.tmdbRating != null && (
        <div style={{ flexShrink: 0, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
          {film.tmdbData.tmdbRating.toFixed(1)}
        </div>
      )}
      {film.watchlistDate && (
        <div style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-dim)', minWidth: 72, textAlign: 'right' }}>
          {film.watchlistDate.slice(0, 10)}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [allFilms, setAllFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('dateAdded')

  useEffect(() => {
    getAllFilms().then(films => {
      setAllFilms(films)
      setLoading(false)
    })
  }, [])

  // Current watchlist = films with onWatchlist: true that haven't been diary-logged
  const unwatchedWatchlist = useMemo(
    () => allFilms.filter(f => f.onWatchlist && f.diaryEntries.length === 0),
    [allFilms]
  )

  // Films ever watchlisted that have since been watched
  const watchedFromWatchlist = useMemo(
    () => allFilms.filter(f => f.watchlistDate && f.diaryEntries.length > 0),
    [allFilms]
  )

  // All watchlist films (including watched ones still on list)
  const allWatchlist = useMemo(
    () => allFilms.filter(f => f.onWatchlist),
    [allFilms]
  )

  // Oldest film on watchlist (by watchlistDate, then year)
  const oldestWatchlistFilm = useMemo(() => {
    if (!unwatchedWatchlist.length) return null
    return [...unwatchedWatchlist].sort((a, b) => {
      const da = a.watchlistDate ?? ''
      const db = b.watchlistDate ?? ''
      if (da && db) return da < db ? -1 : da > db ? 1 : 0
      return a.year - b.year
    })[0]
  }, [unwatchedWatchlist])

  // Avg days on watchlist before watching
  const avgDaysBeforeWatching = useMemo(() => {
    const gaps: number[] = []
    for (const f of watchedFromWatchlist) {
      if (!f.watchlistDate) continue
      const firstWatch = f.diaryEntries
        .map(e => e.watchedDate)
        .filter(Boolean)
        .sort()[0]
      if (!firstWatch) continue
      const gap = daysBetween(f.watchlistDate, firstWatch)
      if (gap >= 0) gaps.push(gap)
    }
    if (!gaps.length) return null
    return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
  }, [watchedFromWatchlist])

  // Completion funnel: films with watchlistDate that have been watched
  const everWatchlisted = useMemo(
    () => allFilms.filter(f => f.watchlistDate),
    [allFilms]
  )
  const completionPct = useMemo(() => {
    if (!everWatchlisted.length) return null
    const watched = everWatchlisted.filter(f => f.diaryEntries.length > 0).length
    return Math.round((watched / everWatchlisted.length) * 100)
  }, [everWatchlisted])

  // Genre gap: watchlist genres vs watched genres
  const watchlistGenres = useMemo(() => topGenres(unwatchedWatchlist), [unwatchedWatchlist])
  const watchedFilms = useMemo(() => allFilms.filter(f => f.diaryEntries.length > 0), [allFilms])
  const watchedGenres = useMemo(() => topGenres(watchedFilms), [watchedFilms])
  const genreMax = useMemo(
    () => Math.max(watchlistGenres[0]?.count ?? 1, watchedGenres[0]?.count ?? 1),
    [watchlistGenres, watchedGenres]
  )

  // Directors not yet explored: in unwatched watchlist films, not in any logged film
  const unexploredDirectors = useMemo(() => {
    const loggedDirs = new Set<string>()
    for (const f of watchedFilms)
      for (const d of f.tmdbData?.directors ?? [])
        loggedDirs.add(d)

    const wlDirMap = new Map<string, number>()
    for (const f of unwatchedWatchlist)
      for (const d of f.tmdbData?.directors ?? [])
        if (!loggedDirs.has(d))
          wlDirMap.set(d, (wlDirMap.get(d) ?? 0) + 1)

    return [...wlDirMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [unwatchedWatchlist, watchedFilms])

  const sortedFilms = useMemo(
    () => sortWatchlistFilms(unwatchedWatchlist, sortBy),
    [unwatchedWatchlist, sortBy]
  )

  if (loading) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>loading...</span>
      </div>
    )
  }

  if (allWatchlist.length === 0) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: 900 }}>
        <h1 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)', marginBottom: 12 }}>Watchlist</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          your watchlist is empty — add films on Letterboxd and re-import your export
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 24px 40px', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)', marginBottom: 20 }}>
        Watchlist
      </h1>

      {/* Hero stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
        <StatPill value={String(unwatchedWatchlist.length)} label="films to watch" />
        {oldestWatchlistFilm && (
          <StatPill
            value={oldestWatchlistFilm.watchlistDate?.slice(0, 4) ?? String(oldestWatchlistFilm.year)}
            label={`oldest: ${oldestWatchlistFilm.title.slice(0, 18)}`}
          />
        )}
        {avgDaysBeforeWatching != null && (
          <StatPill
            value={avgDaysBeforeWatching >= 365 ? `${Math.round(avgDaysBeforeWatching / 365)}y` : `${avgDaysBeforeWatching}d`}
            label="avg time before watching"
          />
        )}
        {completionPct != null && (
          <StatPill value={`${completionPct}%`} label="of watchlisted films watched" />
        )}
      </div>

      {/* Completion funnel bar */}
      {completionPct != null && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>watchlist completion</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-dim)' }}>
              {watchedFromWatchlist.length} / {everWatchlisted.length}
            </span>
          </div>
          <div style={{ height: 6, backgroundColor: 'var(--surface-raised)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${completionPct}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
            of films ever added to your watchlist, you've since watched {completionPct}%
          </div>
        </div>
      )}

      {/* Genre gap */}
      {(watchlistGenres.length > 0 || watchedGenres.length > 0) && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>what you intend to watch vs what you actually watch</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
            the gap between these reveals your blind spots
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <GenreColumn title="watchlist" genres={watchlistGenres} max={genreMax} />
            <GenreColumn title="watched" genres={watchedGenres} max={genreMax} />
          </div>
        </div>
      )}

      {/* Unexplored directors */}
      {unexploredDirectors.length > 0 && (
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>directors you haven't explored yet</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14 }}>
            they're on your watchlist but you haven't logged any of their films
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unexploredDirectors.map(d => (
              <div
                key={d.name}
                style={{
                  padding: '5px 10px',
                  backgroundColor: 'var(--surface-raised)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                }}
              >
                {d.name}
                <span style={{ color: 'var(--text-dim)', marginLeft: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Films list */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            films sitting on your watchlist
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['dateAdded', 'tmdbRating', 'releaseYear'] as const).map(key => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  color: sortBy === key ? 'var(--accent)' : 'var(--text-dim)',
                  backgroundColor: sortBy === key ? 'var(--accent-dim)' : 'transparent',
                  border: `1px solid ${sortBy === key ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                {key === 'dateAdded' ? 'date added' : key === 'tmdbRating' ? 'TMDB rating' : 'release year'}
              </button>
            ))}
          </div>
        </div>

        {sortedFilms.slice(0, 100).map(f => (
          <FilmRow key={f.uri} film={f} />
        ))}

        {sortedFilms.length === 0 && (
          <div style={{ padding: '16px 0', color: 'var(--text-dim)', fontSize: 13 }}>
            no unwatched films on your watchlist right now
          </div>
        )}

        {sortedFilms.length > 100 && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', paddingTop: 12 }}>
            showing 100 of {sortedFilms.length} films
          </div>
        )}
      </div>
    </div>
  )
}
