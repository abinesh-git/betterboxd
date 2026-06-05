import { useEffect, useMemo, useState } from 'react'
import { getAllFilms } from '../lib/stats'
import type { Film } from '../types'
import oscarData from '../lib/lists/oscar-best-picture'
import cannesData from '../lib/lists/cannes-palme-dor'
import imdb250Data from '../lib/lists/imdb-top-250'
import type { AwardEntry } from '../lib/lists/oscar-best-picture'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'awards' | 'collections' | 'toplists'

interface Collection {
  id: number
  name: string
  seenFilms: Film[]
}

interface CollectionDetail {
  id: number
  name: string
  parts: { id: number; title: string; release_date: string; poster_path?: string }[]
}

// ─── Matching helpers ─────────────────────────────────────────────────────────

function buildLookups(films: Film[]) {
  const byImdb = new Map<string, Film>()
  const byTitleYear = new Map<string, Film>()
  for (const film of films) {
    if (film.tmdbData?.imdbId) byImdb.set(film.tmdbData.imdbId, film)
    byTitleYear.set(`${film.title.trim().toLowerCase()}|||${film.year}`, film)
  }
  return { byImdb, byTitleYear }
}

function findMatch(
  entry: { imdbId?: string; title: string; year: number },
  byImdb: Map<string, Film>,
  byTitleYear: Map<string, Film>
): Film | undefined {
  if (entry.imdbId) {
    const m = byImdb.get(entry.imdbId)
    if (m) return m
  }
  return byTitleYear.get(`${entry.title.trim().toLowerCase()}|||${entry.year}`)
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'Clash Display, sans-serif',
        fontWeight: 600,
        fontSize: 11,
        color: 'var(--text-dim)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  )
}

function ProgressBar({ seen, total }: { seen: number; total: number }) {
  const pct = total > 0 ? seen / total : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 5,
          backgroundColor: 'var(--surface-raised)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            backgroundColor: 'var(--accent)',
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span
        style={{
          flexShrink: 0,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
      >
        {seen} / {total}
      </span>
    </div>
  )
}

function FilmCard({
  film,
  entry,
}: {
  film: Film | undefined
  entry: { title: string; year: number }
}) {
  const seen = !!film
  const poster = film?.tmdbData?.posterPath

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        opacity: seen ? 1 : 0.3,
        transition: 'opacity 0.15s',
      }}
    >
      {poster ? (
        <img
          src={`https://image.tmdb.org/t/p/w154${poster}`}
          alt=""
          style={{
            width: '100%',
            aspectRatio: '2 / 3',
            objectFit: 'cover',
            borderRadius: 'var(--radius-sm)',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '2 / 3',
            backgroundColor: 'var(--surface-raised)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: 8,
              color: 'var(--text-dim)',
              textAlign: 'center',
              padding: '0 4px',
            }}
          >
            {entry.title}
          </span>
        </div>
      )}
      <div
        style={{
          fontSize: 10,
          color: seen ? 'var(--text-secondary)' : 'var(--text-dim)',
          marginTop: 4,
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
        }}
      >
        {entry.title}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 1 }}>{entry.year}</div>
      {seen && film.rating != null && (
        <div
          style={{
            fontSize: 9,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--accent)',
            marginTop: 1,
          }}
        >
          {film.rating.toFixed(1)}★
        </div>
      )}
    </div>
  )
}

// ─── Awards tab ───────────────────────────────────────────────────────────────

function AwardSection({
  title,
  entries,
  byImdb,
  byTitleYear,
}: {
  title: string
  entries: AwardEntry[]
  byImdb: Map<string, Film>
  byTitleYear: Map<string, Film>
}) {
  const matched = useMemo(
    () => entries.map(e => ({ entry: e, film: findMatch(e, byImdb, byTitleYear) })),
    [entries, byImdb, byTitleYear]
  )
  const seen = matched.filter(m => m.film).length

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 15,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {seen} seen of {entries.length}
        </span>
      </div>

      <ProgressBar seen={seen} total={entries.length} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: 8,
          marginTop: 16,
        }}
      >
        {matched.map(({ entry, film }) => (
          <FilmCard key={`${entry.title}-${entry.year}`} film={film} entry={entry} />
        ))}
      </div>
    </div>
  )
}

function AwardsTab({
  byImdb,
  byTitleYear,
}: {
  byImdb: Map<string, Film>
  byTitleYear: Map<string, Film>
}) {
  return (
    <div>
      <AwardSection
        title="Oscar — Best Picture"
        entries={oscarData}
        byImdb={byImdb}
        byTitleYear={byTitleYear}
      />
      <AwardSection
        title="Cannes — Palme d'Or"
        entries={cannesData}
        byImdb={byImdb}
        byTitleYear={byTitleYear}
      />
    </div>
  )
}

// ─── Collections tab ──────────────────────────────────────────────────────────

function CompletionRing({ seen, total }: { seen: number; total: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(seen / total, 1) : 0
  return (
    <svg width={56} height={56} viewBox="0 0 56 56" style={{ flexShrink: 0 }}>
      <circle
        cx={28}
        cy={28}
        r={r}
        style={{ fill: 'none', stroke: 'var(--surface-raised)', strokeWidth: 5 }}
      />
      <circle
        cx={28}
        cy={28}
        r={r}
        style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 5, strokeLinecap: 'round' as const }}
        strokeDasharray={`${pct * circ} ${circ}`}
        transform="rotate(-90 28 28)"
      />
      <text
        x={28}
        y={32}
        textAnchor="middle"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          fill: 'var(--text-primary)',
        }}
      >
        {seen}
      </text>
    </svg>
  )
}

function CollectionCard({
  collection,
  detail,
  allTmdbIds,
}: {
  collection: Collection
  detail: CollectionDetail | undefined
  allTmdbIds: Set<number>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const releasedParts = (detail?.parts ?? []).filter(p => p.release_date && p.release_date <= today)
  const totalFromTmdb = detail ? releasedParts.length : undefined
  const missing = releasedParts.filter(p => !allTmdbIds.has(p.id))

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
        <CompletionRing
          seen={collection.seenFilms.length}
          total={totalFromTmdb != null ? totalFromTmdb : collection.seenFilms.length}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'Clash Display, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {collection.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>
            {collection.seenFilms.length} seen
            {totalFromTmdb != null && ` of ${totalFromTmdb}`}
            {(() => {
              const rated = collection.seenFilms.filter(f => f.rating != null)
              if (rated.length === 0) return null
              const avg = rated.reduce((s, f) => s + f.rating!, 0) / rated.length
              return <span style={{ marginLeft: 8, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{avg.toFixed(1)}★</span>
            })()}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: missing.length > 0 ? 14 : 0,
        }}
      >
        {collection.seenFilms.slice(0, 8).map(f => (
          <div key={f.uri} title={f.title}>
            {f.tmdbData?.posterPath ? (
              <img
                src={`https://image.tmdb.org/t/p/w92${f.tmdbData.posterPath}`}
                alt={f.title}
                style={{
                  width: 36,
                  height: 54,
                  objectFit: 'cover',
                  borderRadius: 3,
                }}
              />
            ) : (
              <div
                style={{
                  width: 36,
                  height: 54,
                  borderRadius: 3,
                  backgroundColor: 'var(--surface-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 7,
                    color: 'var(--text-dim)',
                    textAlign: 'center',
                    padding: '0 2px',
                  }}
                >
                  {f.title.slice(0, 6)}
                </span>
              </div>
            )}
          </div>
        ))}
        {collection.seenFilms.length > 8 && (
          <div
            style={{
              width: 36,
              height: 54,
              borderRadius: 3,
              backgroundColor: 'var(--surface-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: 'var(--text-dim)',
            }}
          >
            +{collection.seenFilms.length - 8}
          </div>
        )}
      </div>

      {missing.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>
            not yet seen
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {missing.slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {p.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${p.poster_path}`}
                    alt=""
                    style={{
                      width: 24,
                      height: 36,
                      objectFit: 'cover',
                      borderRadius: 2,
                      flexShrink: 0,
                      opacity: 0.5,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 24,
                      height: 36,
                      backgroundColor: 'var(--surface-raised)',
                      borderRadius: 2,
                      flexShrink: 0,
                      opacity: 0.5,
                    }}
                  />
                )}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                    {p.release_date ? p.release_date.slice(0, 4) : '—'}
                  </div>
                </div>
              </div>
            ))}
            {missing.length > 5 && (
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                and {missing.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {!detail && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-dim)',
            fontFamily: 'JetBrains Mono, monospace',
            marginTop: 4,
          }}
        >
          loading collection data...
        </div>
      )}
    </div>
  )
}

function CollectionsTab({
  collections,
  allTmdbIds,
}: {
  collections: Collection[]
  allTmdbIds: Set<number>
}) {
  const [details, setDetails] = useState<Map<number, CollectionDetail>>(new Map())
  const [search, setSearch] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['inprogress']))

  useEffect(() => {
    if (collections.length === 0) return
    const token = import.meta.env.VITE_TMDB_READ_TOKEN as string
    if (!token) return

    for (const col of collections) {
      fetch(`https://api.themoviedb.org/3/collection/${col.id}?language=en-US`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => { if (!r.ok) return; return r.json() })
        .then((data) => {
          if (!data || !Array.isArray(data.parts)) return
          setDetails(prev => new Map([...prev, [col.id, data as CollectionDetail]]))
        })
        .catch(() => {})
    }
  }, [collections])

  function toggleGroup(g: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g); else next.add(g)
      return next
    })
  }

  if (collections.length === 0) {
    return (
      <div style={{ padding: '24px 0', color: 'var(--text-dim)', fontSize: 13 }}>
        No franchise collections found — enrich your films to detect them.
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)
  const filtered = search.trim()
    ? collections.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : collections

  function getPct(col: Collection): number {
    const detail = details.get(col.id)
    if (!detail) return col.seenFilms.length > 0 ? 0.5 : 0 // unknown — treat as in-progress if seen any
    const released = detail.parts.filter(p => p.release_date && p.release_date <= today)
    if (released.length === 0) return col.seenFilms.length > 0 ? 1 : 0
    return col.seenFilms.length / released.length
  }

  const completed = filtered.filter(c => details.has(c.id) && getPct(c) >= 1)
  const inProgress = filtered.filter(c => {
    const pct = getPct(c)
    return pct > 0 && pct < 1
  })
  const notStarted = filtered.filter(c => getPct(c) === 0)

  function GroupSection({ groupKey, title, cols }: { groupKey: string; title: string; cols: Collection[] }) {
    const isOpen = openGroups.has(groupKey)
    return (
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => toggleGroup(groupKey)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0', marginBottom: isOpen ? 8 : 0, color: 'var(--text-secondary)' }}
        >
          <span style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{title}</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-dim)' }}>{cols.length}</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && cols.map(col => (
          <CollectionCard
            key={col.id}
            collection={col}
            detail={details.get(col.id)}
            allTmdbIds={allTmdbIds}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search collections..."
        style={{
          width: '100%',
          padding: '8px 12px',
          marginBottom: 16,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
          fontSize: 13,
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      {inProgress.length > 0 && <GroupSection groupKey="inprogress" title="In progress" cols={inProgress} />}
      {completed.length > 0 && <GroupSection groupKey="completed" title="Completed" cols={completed} />}
      {notStarted.length > 0 && <GroupSection groupKey="notstarted" title="Not started" cols={notStarted} />}
      {filtered.length === 0 && (
        <div style={{ padding: '24px 0', color: 'var(--text-dim)', fontSize: 13 }}>No collections match.</div>
      )}
    </div>
  )
}

// ─── Top Lists tab ────────────────────────────────────────────────────────────

function TopListsTab({
  byImdb,
  byTitleYear,
}: {
  byImdb: Map<string, Film>
  byTitleYear: Map<string, Film>
}) {
  const [expandedList, setExpandedList] = useState<string | null>(null)

  const imdbMatched = useMemo(
    () => imdb250Data.map((e, i) => ({ entry: { ...e, rank: e.rank ?? i + 1 }, film: findMatch(e, byImdb, byTitleYear) })),
    [byImdb, byTitleYear]
  )

  const lists = useMemo(() => [
    {
      key: 'imdb250',
      name: 'IMDB Top 250',
      snapshot: '2025',
      matched: imdbMatched,
    },
  ], [imdbMatched])

  return (
    <div>
      {/* Overview cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {lists.map(list => {
          const seen = list.matched.filter(m => m.film).length
          const total = list.matched.length
          const pct = total > 0 ? Math.round((seen / total) * 100) : 0
          const isExpanded = expandedList === list.key
          return (
            <button
              key={list.key}
              onClick={() => setExpandedList(isExpanded ? null : list.key)}
              style={{
                backgroundColor: isExpanded ? 'var(--accent-dim)' : 'var(--surface)',
                border: `1px solid ${isExpanded ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '16px 18px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background 0.15s, border 0.15s',
              }}
            >
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 10 }}>
                {list.name}
              </div>
              <ProgressBar seen={seen} total={total} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-dim)' }}>{seen} / {total}</span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 11,
                  color: pct >= 80 ? 'var(--success)' : pct >= 40 ? 'var(--accent)' : 'var(--text-dim)',
                  backgroundColor: 'var(--surface-raised)',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-sm)',
                }}>{pct}%</span>
              </div>
              {list.snapshot && <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6 }}>snapshot · {list.snapshot}</div>}
            </button>
          )
        })}
      </div>

      {/* Expanded content */}
      {lists.map(list => {
        if (expandedList !== list.key) return null
        const seen = list.matched.filter(m => m.film)
        const unseen = list.matched.filter(m => !m.film)
        const top5Unseen = unseen.slice(0, 5)
        return (
          <div
            key={list.key}
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
            }}
          >
            {/* 5 to watch next */}
            {top5Unseen.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <SectionLabel>5 to watch next</SectionLabel>
                {top5Unseen.map(({ entry }) => (
                  <div key={entry.imdbId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ width: 28, flexShrink: 0, textAlign: 'right', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>{entry.rank}</span>
                    <div style={{ width: 24, height: 36, backgroundColor: 'var(--surface-raised)', borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{entry.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{entry.year}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Seen films poster grid */}
            {seen.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <SectionLabel>seen ({seen.length})</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {seen.map(({ entry, film }) => (
                    <div key={entry.imdbId} title={`${entry.title} (${entry.year})`}>
                      {film?.tmdbData?.posterPath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${film.tmdbData.posterPath}`}
                          alt=""
                          style={{ width: 50, height: 75, objectFit: 'cover', borderRadius: 3 }}
                        />
                      ) : (
                        <div style={{ width: 50, height: 75, backgroundColor: 'var(--surface-raised)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 7, color: 'var(--text-dim)', textAlign: 'center', padding: '0 2px' }}>{entry.title.slice(0, 8)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All unseen */}
            {unseen.length > 0 && (
              <div>
                <SectionLabel>not yet seen ({unseen.length})</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {unseen.map(({ entry }) => (
                    <div key={entry.imdbId} title={`#${entry.rank} ${entry.title} (${entry.year})`}>
                      <div style={{ width: 50, height: 75, backgroundColor: 'var(--surface-raised)', borderRadius: 3, opacity: 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 7, color: 'var(--text-dim)', textAlign: 'center', padding: '0 2px' }}>{entry.title.slice(0, 8)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'awards', label: 'Awards' },
  { key: 'collections', label: 'Collections' },
  { key: 'toplists', label: 'Top Lists' },
]

export default function ListsPage() {
  const [tab, setTab] = useState<TabKey>('awards')
  const [allFilms, setAllFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllFilms().then(films => {
      setAllFilms(films)
      setLoading(false)
    })
  }, [])

  const { byImdb, byTitleYear } = useMemo(() => buildLookups(allFilms), [allFilms])

  const allTmdbIds = useMemo(
    () => new Set(allFilms.filter(f => f.tmdbId != null).map(f => f.tmdbId!)),
    [allFilms]
  )

  const collections = useMemo<Collection[]>(() => {
    const map = new Map<number, Collection>()
    for (const film of allFilms) {
      const col = film.tmdbData?.collection
      if (!col) continue
      if (!map.has(col.id)) map.set(col.id, { id: col.id, name: col.name, seenFilms: [] })
      map.get(col.id)!.seenFilms.push(film)
    }
    return Array.from(map.values()).sort((a, b) => b.seenFilms.length - a.seenFilms.length)
  }, [allFilms])

  if (loading) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <span
          style={{
            color: 'var(--text-dim)',
            fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          loading...
        </span>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 24px 40px', maxWidth: 900 }}>
      <h1
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--text-primary)',
          marginBottom: 24,
        }}
      >
        Lists
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          borderBottom: '1px solid var(--border)',
          overflowX: 'auto',
        }}
      >
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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

      {tab === 'awards' && <AwardsTab byImdb={byImdb} byTitleYear={byTitleYear} />}
      {tab === 'collections' && (
        <CollectionsTab collections={collections} allTmdbIds={allTmdbIds} />
      )}
      {tab === 'toplists' && <TopListsTab byImdb={byImdb} byTitleYear={byTitleYear} />}
    </div>
  )
}
