import { useEffect, useMemo, useState } from 'react'
import { getAllFilms } from '../lib/stats'
import type { Film } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function filmAvg(films: Film[]): number | undefined {
  const rated = films.filter(f => f.rating != null)
  if (!rated.length) return undefined
  return rated.reduce((s, f) => s + f.rating!, 0) / rated.length
}

function buildTagMap(films: Film[]): Map<string, Film[]> {
  const map = new Map<string, Film[]>()
  for (const film of films) {
    const seen = new Set<string>()
    for (const entry of film.diaryEntries) {
      for (const raw of entry.tags) {
        const tag = raw.trim()
        if (!tag || seen.has(tag)) continue
        seen.add(tag)
        if (!map.has(tag)) map.set(tag, [])
        map.get(tag)!.push(film)
      }
    }
  }
  return map
}

const BUCKETS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]

interface Breakdown {
  films: Film[]
  avgRating: number | undefined
  ratingDelta: number | undefined
  genreCounts: { name: string; count: number }[]
  yearCounts: { year: number; count: number }[]
  ratingDist: { rating: number; count: number }[]
  topDirectors: { name: string; count: number; avgRating: number | undefined }[]
}

function computeBreakdown(films: Film[], overallAvg: number | undefined): Breakdown {
  const avg = filmAvg(films)

  const genreMap = new Map<string, number>()
  for (const f of films)
    for (const g of f.tmdbData?.genres ?? [])
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1)

  const yearMap = new Map<number, number>()
  for (const f of films)
    if (f.year) yearMap.set(f.year, (yearMap.get(f.year) ?? 0) + 1)

  const ratingMap = new Map<number, number>()
  for (const b of BUCKETS) ratingMap.set(b, 0)
  for (const f of films)
    if (f.rating != null) {
      const b = Math.round(f.rating * 2) / 2
      ratingMap.set(b, (ratingMap.get(b) ?? 0) + 1)
    }

  const dirMap = new Map<string, Film[]>()
  for (const f of films)
    for (const d of f.tmdbData?.directors ?? []) {
      if (!dirMap.has(d)) dirMap.set(d, [])
      dirMap.get(d)!.push(f)
    }

  return {
    films,
    avgRating: avg,
    ratingDelta: avg != null && overallAvg != null ? avg - overallAvg : undefined,
    genreCounts: [...genreMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    yearCounts: [...yearMap.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    ratingDist: BUCKETS.map(r => ({ rating: r, count: ratingMap.get(r) ?? 0 })),
    topDirectors: [...dirMap.entries()]
      .map(([name, dFilms]) => ({
        name,
        count: dFilms.length,
        avgRating: filmAvg(dFilms),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MiniBar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ width: 100, flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-raised)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${(count / max) * 100}%`, height: '100%', backgroundColor: 'var(--accent)', borderRadius: 2 }} />
      </div>
      <div style={{ width: 28, flexShrink: 0, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', textAlign: 'right' }}>
        {count}
      </div>
    </div>
  )
}

function RatingDistBars({ dist }: { dist: { rating: number; count: number }[] }) {
  const max = Math.max(...dist.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 52 }}>
      {dist.map(d => (
        <div key={d.rating} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div
            style={{
              width: '100%',
              height: `${(d.count / max) * 44}px`,
              backgroundColor: d.count > 0 ? 'var(--accent)' : 'var(--surface-raised)',
              borderRadius: 2,
              opacity: d.count > 0 ? 0.5 + 0.5 * (d.count / max) : 1,
            }}
          />
          <div style={{ fontSize: 8, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            {d.rating % 1 === 0 ? String(d.rating) : ''}
          </div>
        </div>
      ))}
    </div>
  )
}

function ComparePanel({ tag, breakdown }: { tag: string; breakdown: Breakdown }) {
  const genreMax = breakdown.genreCounts[0]?.count ?? 1
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 18, color: 'var(--text-primary)', marginBottom: 4 }}>
          {tag}
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-primary)' }}>
            {breakdown.films.length} films
          </span>
          {breakdown.avgRating != null && (
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--accent)' }}>
              {breakdown.avgRating.toFixed(2)}★
            </span>
          )}
        </div>
        {breakdown.ratingDelta != null && Math.abs(breakdown.ratingDelta) >= 0.1 && (
          <div style={{ fontSize: 11, color: breakdown.ratingDelta > 0 ? 'var(--success)' : 'var(--danger)', marginTop: 4 }}>
            {breakdown.ratingDelta > 0 ? '+' : ''}{breakdown.ratingDelta.toFixed(2)}★ vs overall avg
          </div>
        )}
      </div>

      {breakdown.genreCounts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 8 }}>genres</div>
          {breakdown.genreCounts.slice(0, 6).map(g => (
            <MiniBar key={g.name} label={g.name} count={g.count} max={genreMax} />
          ))}
        </div>
      )}

      {breakdown.topDirectors.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 8 }}>directors</div>
          {breakdown.topDirectors.map(d => (
            <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
              <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{d.name}</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', flexShrink: 0, marginLeft: 8 }}>
                {d.count}{d.avgRating != null ? ` · ${d.avgRating.toFixed(1)}★` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tag detail view ───────────────────────────────────────────────────────────

function TagDetailView({
  tag,
  breakdown,
  allTags,
  overallAvg,
  onBack,
  compareTag,
  onCompareTagChange,
}: {
  tag: string
  breakdown: Breakdown
  allTags: { tag: string; count: number }[]
  overallAvg: number | undefined
  onBack: () => void
  compareTag: string | null
  onCompareTagChange: (t: string | null) => void
}) {
  const [filmSearch, setFilmSearch] = useState('')

  const genreMax = breakdown.genreCounts[0]?.count ?? 1
  const yearMax = Math.max(...breakdown.yearCounts.map(y => y.count), 1)
  const visibleFilms = breakdown.films.filter(f =>
    !filmSearch || f.title.toLowerCase().includes(filmSearch.toLowerCase())
  )

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 0 }}
        >
          ← tags
        </button>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{tag}</span>
      </div>

      {/* Tag header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)' }}>
          {tag}
        </h2>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'var(--text-dim)' }}>
          {breakdown.films.length} films
        </span>
        {breakdown.avgRating != null && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'var(--accent)' }}>
            {breakdown.avgRating.toFixed(2)}★ avg
          </span>
        )}
      </div>

      {/* Rating delta insight */}
      {breakdown.ratingDelta != null && Math.abs(breakdown.ratingDelta) >= 0.1 && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: 'var(--accent-dim)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--text-primary)',
          marginBottom: 20,
        }}>
          you rate <strong>{tag}</strong> watches{' '}
          <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
            {Math.abs(breakdown.ratingDelta).toFixed(2)}★
          </span>{' '}
          {breakdown.ratingDelta > 0 ? 'higher' : 'lower'} than your average
          {overallAvg != null && (
            <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 8 }}>
              (overall: {overallAvg.toFixed(2)}★)
            </span>
          )}
        </div>
      )}

      {/* Compare selector */}
      <div style={{ marginBottom: 24 }}>
        <select
          value={compareTag ?? ''}
          onChange={e => onCompareTagChange(e.target.value || null)}
          style={{
            padding: '6px 10px',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <option value="">compare with another tag...</option>
          {allTags.filter(t => t.tag !== tag).map(t => (
            <option key={t.tag} value={t.tag}>{t.tag} ({t.count})</option>
          ))}
        </select>
      </div>

      {/* Breakdown grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 12 }}>genres</div>
          {breakdown.genreCounts.length > 0
            ? breakdown.genreCounts.map(g => <MiniBar key={g.name} label={g.name} count={g.count} max={genreMax} />)
            : <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>no enriched films</div>
          }
        </div>

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 12 }}>rating distribution</div>
          <RatingDistBars dist={breakdown.ratingDist} />
        </div>

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 12 }}>by release year</div>
          {breakdown.yearCounts.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 52 }}>
              {breakdown.yearCounts.map(y => (
                <div
                  key={y.year}
                  title={`${y.year}: ${y.count}`}
                  style={{
                    flex: 1,
                    minWidth: 2,
                    height: `${(y.count / yearMax) * 48}px`,
                    backgroundColor: 'var(--accent)',
                    opacity: 0.4 + 0.6 * (y.count / yearMax),
                    borderRadius: '1px 1px 0 0',
                  }}
                />
              ))}
            </div>
          ) : <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>no data</div>}
        </div>

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 12 }}>top directors</div>
          {breakdown.topDirectors.length > 0
            ? breakdown.topDirectors.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', width: 14, fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>
                    {d.count}{d.avgRating != null ? ` · ${d.avgRating.toFixed(1)}★` : ''}
                  </span>
                </div>
              ))
            : <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>no director data</div>
          }
        </div>
      </div>

      {/* Films */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
            films
          </div>
          <input
            placeholder="search..."
            value={filmSearch}
            onChange={e => setFilmSearch(e.target.value)}
            style={{
              padding: '4px 10px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 12,
              width: 140,
            }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
          {visibleFilms.slice(0, 60).map(f => (
            <div key={f.uri} style={{ display: 'flex', flexDirection: 'column' }}>
              {f.tmdbData?.posterPath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w154${f.tmdbData.posterPath}`}
                  alt=""
                  style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                />
              ) : (
                <div style={{ width: '100%', aspectRatio: '2/3', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: 'var(--text-dim)', textAlign: 'center', padding: '0 4px' }}>{f.title}</span>
                </div>
              )}
              <div style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{f.title}</div>
              {f.rating != null && (
                <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{f.rating.toFixed(1)}★</div>
              )}
            </div>
          ))}
        </div>
        {visibleFilms.length > 60 && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12 }}>showing 60 of {visibleFilms.length}</div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type TagView =
  | { kind: 'list' }
  | { kind: 'detail'; tag: string; compareTag: string | null }

export default function TagsPage() {
  const [allFilms, setAllFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<TagView>({ kind: 'list' })
  const [search, setSearch] = useState('')

  useEffect(() => {
    getAllFilms().then(films => {
      setAllFilms(films)
      setLoading(false)
    })
  }, [])

  const tagMap = useMemo(() => buildTagMap(allFilms), [allFilms])
  const overallAvg = useMemo(() => filmAvg(allFilms), [allFilms])

  const tagList = useMemo(() =>
    [...tagMap.entries()]
      .map(([tag, films]) => ({ tag, count: films.length, avgRating: filmAvg(films) }))
      .sort((a, b) => b.count - a.count),
    [tagMap]
  )

  const filteredTags = useMemo(() =>
    search ? tagList.filter(t => t.tag.toLowerCase().includes(search.toLowerCase())) : tagList,
    [tagList, search]
  )

  const primaryBreakdown = useMemo(() => {
    if (view.kind !== 'detail') return null
    const films = tagMap.get(view.tag) ?? []
    return computeBreakdown(films, overallAvg)
  }, [view, tagMap, overallAvg])

  const compareBreakdown = useMemo(() => {
    if (view.kind !== 'detail' || !view.compareTag) return null
    const films = tagMap.get(view.compareTag) ?? []
    return computeBreakdown(films, overallAvg)
  }, [view, tagMap, overallAvg])

  if (loading) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>loading...</span>
      </div>
    )
  }

  // Comparison mode
  if (view.kind === 'detail' && view.compareTag && primaryBreakdown && compareBreakdown) {
    return (
      <div style={{ padding: '24px 24px 40px', maxWidth: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setView({ kind: 'detail', tag: view.tag, compareTag: null })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, padding: 0 }}
          >
            ← back
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {view.tag} vs {view.compareTag}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24 }}>
          <ComparePanel tag={view.tag} breakdown={primaryBreakdown} />
          <div style={{ width: 1, backgroundColor: 'var(--border)', alignSelf: 'stretch' }} />
          <ComparePanel tag={view.compareTag} breakdown={compareBreakdown} />
        </div>
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setView({ kind: 'detail', tag: view.tag, compareTag: null })}
            style={{ padding: '6px 14px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
          >
            exit comparison
          </button>
        </div>
      </div>
    )
  }

  // Detail mode
  if (view.kind === 'detail' && primaryBreakdown) {
    return (
      <div style={{ padding: '24px 24px 40px', maxWidth: 900 }}>
        <TagDetailView
          tag={view.tag}
          breakdown={primaryBreakdown}
          allTags={tagList}
          overallAvg={overallAvg}
          onBack={() => setView({ kind: 'list' })}
          compareTag={view.compareTag}
          onCompareTagChange={t => setView({ kind: 'detail', tag: view.tag, compareTag: t })}
        />
      </div>
    )
  }

  // List mode
  return (
    <div style={{ padding: '24px 24px 40px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)' }}>
          Tags
        </h1>
        <span style={{ fontSize: 13, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
          {tagList.length} tags
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20 }}>
        your personal diary tags — each one a window into how you watch
      </p>

      {tagList.length === 0 ? (
        <div style={{ padding: '32px 0', color: 'var(--text-dim)', fontSize: 13 }}>
          no tags found — start adding tags to your diary entries on Letterboxd
        </div>
      ) : (
        <>
          <input
            placeholder="find a tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '7px 12px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 13,
              width: '100%',
              maxWidth: 280,
              marginBottom: 20,
              boxSizing: 'border-box' as const,
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {filteredTags.map(({ tag, count, avgRating }) => (
              <button
                key={tag}
                onClick={() => setView({ kind: 'detail', tag, compareTag: null })}
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 500, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {tag}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--accent)' }}>
                    {count}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>films</span>
                  {avgRating != null && (
                    <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                      {avgRating.toFixed(1)}★
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
