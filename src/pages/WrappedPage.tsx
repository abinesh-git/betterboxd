import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { getAllFilms } from '../lib/stats'
import { languageName } from '../lib/stats'
import type { Film } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WrappedData {
  year: number
  filmCount: number
  hours: number
  topFilm: Film | null
  topDirector: string | null
  topGenre: string | null
  topMonth: string | null
  mostRewatched: Film | null
  newCountries: string[]
  avgRating: number | undefined
  topLanguage: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function topOfMap<K>(map: Map<K, number>): K | null {
  let best: K | null = null
  let max = 0
  for (const [k, v] of map) {
    if (v > max) { max = v; best = k }
  }
  return best
}

async function computeWrapped(year: number): Promise<WrappedData> {
  const films = await getAllFilms()

  // Films with at least one diary entry in this year
  const yearFilms = new Map<string, Film>()
  const rewatchCounts = new Map<string, number>()

  for (const f of films) {
    let yearEntries = 0
    for (const d of f.diaryEntries) {
      const y = new Date(d.watchedDate).getFullYear()
      if (y === year) yearEntries++
    }
    if (yearEntries > 0) {
      yearFilms.set(f.uri, f)
      rewatchCounts.set(f.uri, yearEntries)
    }
  }

  const filmArr = Array.from(yearFilms.values())
  const filmCount = filmArr.length

  // Hours from runtime
  const hours = filmArr.reduce((sum, f) => sum + (f.tmdbData?.runtime ?? 0) / 60, 0)

  // Avg rating (canonical rating of films watched this year)
  const rated = filmArr.filter((f) => f.rating != null)
  const avgRating = rated.length
    ? rated.reduce((s, f) => s + f.rating!, 0) / rated.length
    : undefined

  // Top film (highest canonical rating, then by TMDB rating as tiebreak)
  const topFilm = filmArr
    .filter((f) => f.rating != null)
    .sort((a, b) => {
      const rDiff = (b.rating ?? 0) - (a.rating ?? 0)
      if (rDiff !== 0) return rDiff
      return (b.tmdbData?.tmdbRating ?? 0) - (a.tmdbData?.tmdbRating ?? 0)
    })[0] ?? null

  // Top director
  const dirCount = new Map<string, number>()
  for (const f of filmArr) {
    for (const d of f.tmdbData?.directors ?? []) {
      dirCount.set(d, (dirCount.get(d) ?? 0) + 1)
    }
  }
  const topDirector = topOfMap(dirCount)

  // Top genre
  const genreCount = new Map<string, number>()
  for (const f of filmArr) {
    for (const g of f.tmdbData?.genres ?? []) {
      genreCount.set(g, (genreCount.get(g) ?? 0) + 1)
    }
  }
  const topGenre = topOfMap(genreCount)

  // Top month (diary entries in this year)
  const monthCount = new Map<number, number>()
  for (const f of filmArr) {
    for (const d of f.diaryEntries) {
      if (new Date(d.watchedDate).getFullYear() !== year) continue
      const m = new Date(d.watchedDate).getMonth() // 0-indexed
      monthCount.set(m, (monthCount.get(m) ?? 0) + 1)
    }
  }
  const topMonthIdx = topOfMap(monthCount)
  const topMonth = topMonthIdx != null ? MONTH_NAMES[topMonthIdx] : null

  // Most rewatched (most diary entries this year for a single film)
  const mostRewatchedUri = topOfMap(rewatchCounts)
  const mostRewatched = mostRewatchedUri ? (yearFilms.get(mostRewatchedUri) ?? null) : null

  // New countries (countries from films logged this year that weren't logged in prior years)
  const priorCountries = new Set<string>()
  for (const f of films) {
    for (const d of f.diaryEntries) {
      if (new Date(d.watchedDate).getFullYear() < year) {
        for (const c of f.tmdbData?.productionCountries ?? []) priorCountries.add(c)
      }
    }
  }
  const thisYearCountries = new Set<string>()
  for (const f of filmArr) {
    for (const c of f.tmdbData?.productionCountries ?? []) thisYearCountries.add(c)
  }
  const newCountries = Array.from(thisYearCountries).filter((c) => !priorCountries.has(c))

  // Top language
  const langCount = new Map<string, number>()
  for (const f of filmArr) {
    const l = f.tmdbData?.originalLanguage
    if (l) langCount.set(l, (langCount.get(l) ?? 0) + 1)
  }
  const topLangCode = topOfMap(langCount)
  const topLanguage = topLangCode ? languageName(topLangCode) : null

  return {
    year,
    filmCount,
    hours,
    topFilm: topFilm ?? null,
    topDirector,
    topGenre,
    topMonth,
    mostRewatched: mostRewatched ?? null,
    newCountries,
    avgRating,
    topLanguage,
  }
}

// ─── Stat block ───────────────────────────────────────────────────────────────

function StatBlock({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 700,
          fontSize: 28,
          lineHeight: 1,
          color: accent ? 'var(--accent)' : 'var(--text-primary)',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{sub}</div>
      )}
    </div>
  )
}

// ─── The card (captured by html2canvas) ──────────────────────────────────────

function WrappedCard({
  data,
  cardRef,
}: {
  data: WrappedData
  cardRef: React.RefObject<HTMLDivElement | null>
}) {
  const hoursDisplay = data.hours >= 24
    ? `${Math.round(data.hours)}h`
    : `${Math.round(data.hours * 60)}m`
  const daysDisplay = data.hours >= 24 ? `${(data.hours / 24).toFixed(1)} days` : undefined

  return (
    <div
      ref={cardRef}
      style={{
        width: 480,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        position: 'relative',
        padding: 0,
        flexShrink: 0,
      }}
    >
      {/* Top poster strip */}
      {data.topFilm?.tmdbData?.backdropPath && (
        <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
          <img
            src={`https://image.tmdb.org/t/p/w780${data.topFilm.tmdbData.backdropPath}`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, transparent 30%, var(--bg) 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: 28,
              fontFamily: 'Clash Display, sans-serif',
              fontWeight: 700,
              fontSize: 36,
              color: 'var(--text-primary)',
              lineHeight: 1,
            }}
          >
            {data.year}
          </div>
        </div>
      )}

      {!data.topFilm?.tmdbData?.backdropPath && (
        <div
          style={{
            padding: '32px 28px 0',
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 700,
            fontSize: 48,
            color: 'var(--accent)',
            lineHeight: 1,
          }}
        >
          {data.year}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '28px 28px 32px' }}>
        {/* Row 1: film count + hours */}
        <div style={{ display: 'flex', gap: 40, marginBottom: 32 }}>
          <StatBlock label="films" value={data.filmCount.toString()} accent />
          <StatBlock
            label="time watched"
            value={hoursDisplay}
            sub={daysDisplay}
          />
          {data.avgRating != null && (
            <StatBlock
              label="avg rating"
              value={`${data.avgRating.toFixed(2)}★`}
            />
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 28 }} />

        {/* Top film */}
        {data.topFilm && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
            {data.topFilm.tmdbData?.posterPath && (
              <img
                src={`https://image.tmdb.org/t/p/w92${data.topFilm.tmdbData.posterPath}`}
                alt={data.topFilm.title}
                style={{
                  width: 52,
                  height: 78,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)',
                  flexShrink: 0,
                }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
                top film
              </div>
              <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 4 }}>
                {data.topFilm.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {data.topFilm.year}
                {data.topFilm.rating && ` · ${data.topFilm.rating}★`}
              </div>
            </div>
          </div>
        )}

        {/* Grid of 2×2 stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px 40px',
            marginBottom: 28,
          }}
        >
          {data.topDirector && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
                top director
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {data.topDirector}
              </div>
            </div>
          )}
          {data.topGenre && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
                top genre
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {data.topGenre}
              </div>
            </div>
          )}
          {data.topMonth && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
                most active month
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {data.topMonth}
              </div>
            </div>
          )}
          {data.topLanguage && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
                top language
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {data.topLanguage}
              </div>
            </div>
          )}
          {data.mostRewatched && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
                most rewatched
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {data.mostRewatched.title}
              </div>
            </div>
          )}
          {data.newCountries.length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
                new countries
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--success)' }}>
                +{data.newCountries.length}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            cinestamp
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
            cinestamp.vercel.app
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyYear({ year }: { year: number }) {
  return (
    <div
      style={{
        padding: 40,
        textAlign: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--text-dim)',
        fontSize: 14,
        maxWidth: 480,
      }}
    >
      no diary entries found for {year}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WrappedPage() {
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [data, setData] = useState<WrappedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)

  // Load available years on mount
  useEffect(() => {
    getAllFilms().then((films) => {
      const years = new Set<number>()
      for (const f of films) {
        for (const d of f.diaryEntries) {
          const y = new Date(d.watchedDate).getFullYear()
          if (!isNaN(y)) years.add(y)
        }
      }
      const sorted = Array.from(years).sort((a, b) => b - a)
      setAvailableYears(sorted)
      if (sorted.length > 0) setSelectedYear(sorted[0])
    })
  }, [])

  // Recompute when year changes
  useEffect(() => {
    if (selectedYear == null) return
    setLoading(true)
    setData(null)
    computeWrapped(selectedYear).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [selectedYear])

  async function handleShare() {
    if (!cardRef.current) return
    setCapturing(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `cinestamp-${selectedYear ?? 'wrapped'}.png`
      a.click()
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div className="p-6 md:p-8" style={{ maxWidth: 700 }}>
      <h1
        className="font-display"
        style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}
      >
        Wrapped
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32 }}>
        your year in film
      </p>

      {availableYears.length === 0 && !loading && (
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          no diary entries yet — start logging on Letterboxd and re-import your export
        </p>
      )}

      {availableYears.length > 0 && (
        <>
          {/* Year selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
            {availableYears.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: y === selectedYear ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: y === selectedYear ? 'var(--accent-dim)' : 'var(--surface)',
                  color: y === selectedYear ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: y === selectedYear ? 600 : 400,
                }}
              >
                {y}
              </button>
            ))}
          </div>

          {loading && (
            <div
              style={{
                width: 480,
                height: 500,
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
              }}
            />
          )}

          {!loading && data && data.filmCount === 0 && (
            <EmptyYear year={selectedYear!} />
          )}

          {!loading && data && data.filmCount > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 20 }}>
              <WrappedCard data={data} cardRef={cardRef} />

              <button
                onClick={handleShare}
                disabled={capturing}
                style={{
                  padding: '10px 24px',
                  background: capturing ? 'var(--surface-raised)' : 'var(--accent)',
                  color: capturing ? 'var(--text-dim)' : 'var(--bg)',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: capturing ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.15s',
                }}
              >
                {capturing ? 'saving...' : 'save as image'}
              </button>

              <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0 }}>
                saves a PNG to your downloads folder
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
