import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getAllFilms } from '../lib/stats'
import { fetchPersonByName, fetchPersonMovieCredits } from '../lib/tmdb'
import type { Film, CachedPerson } from '../types'
import type { PersonCredit } from '../lib/tmdb'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'directors' | 'cast' | 'cinematographers' | 'composers' | 'screenwriters' | 'editors'
type SortMode = 'count' | 'rating'

interface CrewPerson {
  name: string
  filmCount: number
  avgRating: number | null
  seenFilms: Film[]
}

interface FavoriteResult {
  person: CrewPerson
  score: number
  rewatches: number
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

function computeFavorite(ranking: CrewPerson[]): FavoriteResult | null {
  const candidates = ranking.filter(p => p.filmCount >= 3 && p.avgRating != null)
  if (!candidates.length) return null

  const maxFilms = Math.max(...candidates.map(p => p.filmCount))
  const rewatchCounts = candidates.map(p => p.seenFilms.filter(f => f.diaryEntries.length > 1).length)
  const maxRewatches = Math.max(...rewatchCounts, 1)

  let best: FavoriteResult | null = null
  candidates.forEach((p, i) => {
    const score =
      (p.filmCount / maxFilms) * 0.4 +
      (p.avgRating! / 5) * 0.4 +
      (rewatchCounts[i] / maxRewatches) * 0.2
    if (!best || score > best.score) {
      best = { person: p, score, rewatches: rewatchCounts[i] }
    }
  })
  return best
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortToggle({ mode, set }: { mode: SortMode; set: (m: SortMode) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {(['count', 'rating'] as const).map(m => (
        <button
          key={m}
          onClick={() => set(m)}
          style={{
            padding: '3px 9px', fontSize: 11, fontWeight: 500,
            color: mode === m ? 'var(--accent)' : 'var(--text-dim)',
            backgroundColor: mode === m ? 'var(--accent-dim)' : 'transparent',
            border: `1px solid ${mode === m ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          }}
        >
          {m === 'count' ? 'Most Watched' : 'Highest Rated'}
        </button>
      ))}
    </div>
  )
}

function FavoriteCard({ result, label, onClick }: { result: FavoriteResult; label: string; onClick: () => void }) {
  const { person, rewatches } = result
  return (
    <div style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontFamily: 'Clash Display, sans-serif', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        your favorite {label}
      </div>
      <button
        onClick={onClick}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'block', marginBottom: 4 }}
      >
        <span style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>
          {person.name}
        </span>
      </button>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{person.filmCount}</span> films
        {person.avgRating != null && (
          <><span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{person.avgRating.toFixed(1)}★</span> avg</>
        )}
        <><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{rewatches}</span> rewatches</>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
        Calculated from watch count, your ratings, and rewatches — may differ from your gut feeling.
      </div>
    </div>
  )
}

function RankedRow({
  rank, person, maxCount, profilePath, sortMode, onClick,
}: {
  rank: number
  person: CrewPerson
  maxCount: number
  profilePath: string | null | undefined
  sortMode: SortMode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        width: '100%', padding: '8px 16px',
        backgroundColor: 'transparent', border: 'none',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer', textAlign: 'left',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-raised)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {/* Rank */}
      <span style={{ width: 22, flexShrink: 0, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', textAlign: 'right' }}>
        {rank}
      </span>
      {/* Profile image */}
      <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--surface-raised)' }}>
        {profilePath && (
          <img
            src={`https://image.tmdb.org/t/p/w185${profilePath}`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>
      {/* Name */}
      <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {person.name}
      </span>
      {/* Progress bar — always shows film count proportion */}
      <div style={{ width: 100, flexShrink: 0, height: 4, backgroundColor: 'var(--surface-raised)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(person.filmCount / maxCount) * 100}%`, backgroundColor: 'var(--accent)', borderRadius: 2, transition: 'width 0.3s ease' }} />
      </div>
      {/* Count */}
      <span style={{ width: 44, flexShrink: 0, textAlign: 'right', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: sortMode === 'count' ? 'var(--text-secondary)' : 'var(--text-dim)' }}>
        {person.filmCount}
      </span>
      {/* Avg rating */}
      {person.avgRating != null ? (
        <span style={{ width: 42, flexShrink: 0, textAlign: 'right', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: sortMode === 'rating' ? 'var(--accent)' : 'var(--text-dim)' }}>
          {person.avgRating.toFixed(1)}★
        </span>
      ) : (
        <span style={{ width: 42, flexShrink: 0 }} />
      )}
    </button>
  )
}

// ─── Person drawer ────────────────────────────────────────────────────────────

function PersonDrawer({
  person, allFilms, onClose,
}: {
  person: CrewPerson
  allFilms: Film[]
  onClose: () => void
}) {
  const [personData, setPersonData] = useState<CachedPerson | null>(null)
  const [loadingPerson, setLoadingPerson] = useState(true)
  const [movieCredits, setMovieCredits] = useState<PersonCredit[]>([])
  const [bioExpanded, setBioExpanded] = useState(false)

  useEffect(() => {
    setPersonData(null)
    setLoadingPerson(true)
    setMovieCredits([])
    setBioExpanded(false)
    fetchPersonByName(person.name).then(data => {
      setPersonData(data)
      setLoadingPerson(false)
      if (data?.tmdbPersonId) {
        fetchPersonMovieCredits(data.tmdbPersonId).then(setMovieCredits)
      }
    })
  }, [person.name])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const seenTitleYears = useMemo(() => {
    const s = new Set<string>()
    for (const f of allFilms) s.add(`${f.title.toLowerCase().trim()}|||${f.year}`)
    return s
  }, [allFilms])

  const seenFilmsSorted = useMemo(
    () => [...person.seenFilms].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [person.seenFilms]
  )

  const notYetSeen = useMemo(() =>
    movieCredits
      .filter(c => !seenTitleYears.has(`${c.title.toLowerCase().trim()}|||${c.year}`))
      .slice(0, 10)
  , [movieCredits, seenTitleYears])

  const BIO_LIMIT = 200
  const bio = personData?.biography
  const shortBio = bio && bio.length > BIO_LIMIT ? bio.slice(0, BIO_LIMIT) + '…' : bio
  const displayBio = bioExpanded ? bio : shortBio

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--overlay-heavy)', zIndex: 40 }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(480px, 100vw)',
          backgroundColor: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          zIndex: 50,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Sticky header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0, position: 'sticky', top: 0,
          backgroundColor: 'var(--surface)', zIndex: 1,
        }}>
          <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>
            {person.name}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 20px 32px', flex: 1 }}>

          {/* Profile section */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            {/* Image */}
            <div style={{ flexShrink: 0 }}>
              {loadingPerson ? (
                <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'var(--surface-raised)' }} />
              ) : personData?.profilePath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w185${personData.profilePath}`}
                  alt=""
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'var(--surface-raised)' }} />
              )}
            </div>

            {/* Name + dept */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--text-primary)', marginBottom: 4 }}>
                {person.name}
              </h2>
              {personData?.knownForDepartment && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
                  {personData.knownForDepartment}
                </div>
              )}
              {personData?.birthday && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  {new Date(personData.birthday).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {personData.placeOfBirth && ` · ${personData.placeOfBirth}`}
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {displayBio && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{displayBio}</p>
              {bio && bio.length > BIO_LIMIT && (
                <button
                  onClick={() => setBioExpanded(v => !v)}
                  style={{ background: 'none', border: 'none', padding: '4px 0 0', cursor: 'pointer', fontSize: 12, color: 'var(--accent)' }}
                >
                  {bioExpanded ? 'show less' : 'read more'}
                </button>
              )}
            </div>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 24, padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 500, color: 'var(--accent)' }}>{person.filmCount}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>films watched</div>
            </div>
            {person.avgRating != null && (
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 500, color: 'var(--accent)' }}>{person.avgRating.toFixed(2)}★</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>your avg rating</div>
              </div>
            )}
          </div>

          {/* Films watched grid */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontFamily: 'Clash Display, sans-serif', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Watched ({seenFilmsSorted.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 10 }}>
              {seenFilmsSorted.map(f => (
                <div key={f.uri} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {f.tmdbData?.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w154${f.tmdbData.posterPath}`}
                      alt=""
                      style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ) : (
                    <div style={{ width: 60, height: 90, backgroundColor: 'var(--surface-raised)', borderRadius: 4 }} />
                  )}
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%' }}>
                    {f.title}
                  </div>
                  {f.rating != null && (
                    <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{f.rating.toFixed(1)}★</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Haven't seen yet */}
          {notYetSeen.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontFamily: 'Clash Display, sans-serif', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Haven't seen yet — top by popularity
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 10 }}>
                {notYetSeen.map(c => (
                  <div key={c.tmdbId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    {c.posterPath ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w154${c.posterPath}`}
                        alt=""
                        style={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 4, opacity: 0.75 }}
                      />
                    ) : (
                      <div style={{ width: 60, height: 90, backgroundColor: 'var(--surface-raised)', borderRadius: 4 }} />
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%' }}>
                      {c.title}
                    </div>
                    {c.tmdbRating != null && (
                      <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>{c.tmdbRating.toFixed(1)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
  const [sortMode, setSortMode] = useState<SortMode>('count')
  const [personImages, setPersonImages] = useState<Record<string, string | null>>({})
  const fetchedNamesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    getAllFilms().then(films => { setAllFilms(films); setLoading(false) })
  }, [])

  const ranking = useMemo(() => buildRanking(allFilms, tab), [allFilms, tab])

  const displayRanking = useMemo(() => {
    if (sortMode === 'rating') {
      return [...ranking]
        .filter(p => p.filmCount >= 3 && p.avgRating != null)
        .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    }
    return ranking
  }, [ranking, sortMode])

  const maxCount = Math.max(...displayRanking.map(p => p.filmCount), 1)

  const favorite = useMemo(() => {
    if (tab !== 'directors' && tab !== 'cast') return null
    return computeFavorite(ranking)
  }, [ranking, tab])

  // Lazily fetch profile images for top 20 visible
  useEffect(() => {
    const toFetch = displayRanking.slice(0, 20)
      .map(p => p.name)
      .filter(n => !fetchedNamesRef.current.has(n))
    if (!toFetch.length) return
    toFetch.forEach(n => fetchedNamesRef.current.add(n))
    toFetch.forEach(name => {
      fetchPersonByName(name).then(person => {
        setPersonImages(prev => ({ ...prev, [name]: person?.profilePath ?? null }))
      })
    })
  }, [displayRanking])

  if (loading) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>loading...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 0 40px', maxWidth: 900 }}>
      <div style={{ padding: '0 24px' }}>
        <h1 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)', marginBottom: 24 }}>
          Crew
        </h1>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(null); setSortMode('count') }}
              style={{
                padding: '8px 14px', fontSize: 13, fontWeight: 500,
                color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1,
                transition: 'color 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort toggle + sort note */}
      <div style={{ padding: '14px 24px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <SortToggle mode={sortMode} set={setSortMode} />
        {sortMode === 'rating' && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>min. 3 films</span>
        )}
      </div>

      {/* Favorite card */}
      {favorite && (
        <div style={{ padding: '16px 24px 0' }}>
          <FavoriteCard result={favorite} label={tab === 'cast' ? 'actor' : 'director'} onClick={() => setSelected(favorite.person)} />
        </div>
      )}

      {/* Ranked list */}
      <div style={{ marginTop: 16, marginLeft: 24, marginRight: 24, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Column headers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: 22, flexShrink: 0 }} />
          <span style={{ width: 32, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</span>
          <span style={{ width: 100, flexShrink: 0, fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Films</span>
          <span style={{ width: 44, flexShrink: 0, textAlign: 'right', fontSize: 11, color: sortMode === 'count' ? 'var(--accent)' : 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Count</span>
          <span style={{ width: 42, flexShrink: 0, textAlign: 'right', fontSize: 11, color: sortMode === 'rating' ? 'var(--accent)' : 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg</span>
        </div>

        {displayRanking.length === 0 ? (
          <div style={{ padding: '24px 16px', color: 'var(--text-dim)', fontSize: 13 }}>
            {sortMode === 'rating' ? 'No one with 3+ films yet.' : 'No data yet — enrich your films to see crew.'}
          </div>
        ) : (
          displayRanking.slice(0, 100).map((person, i) => (
            <RankedRow
              key={person.name}
              rank={i + 1}
              person={person}
              maxCount={maxCount}
              profilePath={personImages[person.name]}
              sortMode={sortMode}
              onClick={() => setSelected(person)}
            />
          ))
        )}
      </div>

      {displayRanking.length > 100 && (
        <p style={{ padding: '12px 24px 0', fontSize: 12, color: 'var(--text-dim)' }}>
          Showing top 100 of {displayRanking.length}
        </p>
      )}

      {selected && (
        <PersonDrawer
          person={selected}
          allFilms={allFilms}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
