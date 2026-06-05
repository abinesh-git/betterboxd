import { useEffect, useMemo, useState } from 'react'
import { getAllFilms, languageName } from '../lib/stats'
import type { Film } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

type PeriodMode = 'past7' | 'past30' | 'past90' | 'year' | 'custom' | 'alltime'

interface PeriodConfig {
  mode: PeriodMode
  year?: number
  startDate?: string
  endDate?: string
}

interface PeriodStats {
  filmCount: number
  hours: number
  avgRating: number | undefined
  topGenre: string | undefined
  topDirector: string | undefined
  topLanguage: string | undefined
  mostWatchedDay: string | undefined
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ── Helpers ───────────────────────────────────────────────────────────────────

function periodLabel(config: PeriodConfig): string {
  switch (config.mode) {
    case 'past7': return 'Past 7 days'
    case 'past30': return 'Past 30 days'
    case 'past90': return 'Past 90 days'
    case 'year': return String(config.year ?? new Date().getFullYear())
    case 'custom': return config.startDate && config.endDate
      ? `${config.startDate} → ${config.endDate}`
      : 'Custom range'
    case 'alltime': return 'All time'
  }
}

function periodRange(config: PeriodConfig): [Date, Date] {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const dayMs = 86_400_000

  switch (config.mode) {
    case 'past7': {
      const s = new Date(today.getTime() - 7 * dayMs)
      s.setHours(0, 0, 0, 0)
      return [s, today]
    }
    case 'past30': {
      const s = new Date(today.getTime() - 30 * dayMs)
      s.setHours(0, 0, 0, 0)
      return [s, today]
    }
    case 'past90': {
      const s = new Date(today.getTime() - 90 * dayMs)
      s.setHours(0, 0, 0, 0)
      return [s, today]
    }
    case 'year': {
      const y = config.year ?? today.getFullYear()
      return [new Date(y, 0, 1, 0, 0, 0), new Date(y, 11, 31, 23, 59, 59)]
    }
    case 'custom': {
      const s = config.startDate ? new Date(config.startDate + 'T00:00:00') : new Date(0)
      const e = config.endDate ? new Date(config.endDate + 'T23:59:59') : today
      return [s, e]
    }
    case 'alltime':
      return [new Date(0), today]
  }
}

function computePeriodStats(films: Film[], start: Date, end: Date): PeriodStats {
  const periodUris = new Set<string>()
  const dayCount = new Map<number, number>()

  for (const film of films) {
    for (const entry of film.diaryEntries) {
      if (!entry.watchedDate) continue
      const d = new Date(entry.watchedDate)
      if (d >= start && d <= end) {
        periodUris.add(film.uri)
        const dow = d.getDay()
        dayCount.set(dow, (dayCount.get(dow) ?? 0) + 1)
      }
    }
  }

  const periodFilms = films.filter(f => periodUris.has(f.uri))

  const hours = periodFilms.reduce((s, f) => s + (f.tmdbData?.runtime ?? 0) / 60, 0)

  const rated = periodFilms.filter(f => f.rating != null)
  const avgRating = rated.length > 0
    ? rated.reduce((s, f) => s + f.rating!, 0) / rated.length
    : undefined

  const genreMap = new Map<string, number>()
  for (const f of periodFilms)
    for (const g of f.tmdbData?.genres ?? [])
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1)
  const topGenre = [...genreMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  const dirMap = new Map<string, number>()
  for (const f of periodFilms)
    for (const d of f.tmdbData?.directors ?? [])
      dirMap.set(d, (dirMap.get(d) ?? 0) + 1)
  const topDirector = [...dirMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  const langMap = new Map<string, number>()
  for (const f of periodFilms)
    if (f.tmdbData?.originalLanguage)
      langMap.set(f.tmdbData.originalLanguage, (langMap.get(f.tmdbData.originalLanguage) ?? 0) + 1)
  const topLangCode = [...langMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  const topDayEntry = [...dayCount.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    filmCount: periodFilms.length,
    hours,
    avgRating,
    topGenre,
    topDirector,
    topLanguage: topLangCode ? languageName(topLangCode) : undefined,
    mostWatchedDay: topDayEntry != null ? DAY_NAMES[topDayEntry[0]] : undefined,
  }
}

function availableYears(films: Film[]): number[] {
  const years = new Set<number>()
  for (const f of films)
    for (const e of f.diaryEntries)
      if (e.watchedDate) years.add(new Date(e.watchedDate).getFullYear())
  return [...years].sort((a, b) => b - a)
}

// ── Period selector ───────────────────────────────────────────────────────────

const MODES: { key: PeriodMode; label: string }[] = [
  { key: 'past7', label: '7 days' },
  { key: 'past30', label: '30 days' },
  { key: 'past90', label: '90 days' },
  { key: 'year', label: 'Year' },
  { key: 'custom', label: 'Custom' },
  { key: 'alltime', label: 'All time' },
]

function PeriodSelector({
  config,
  years,
  onChange,
  label,
}: {
  config: PeriodConfig
  years: number[]
  onChange: (c: PeriodConfig) => void
  label: string
}) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => onChange({ mode: m.key, year: config.year })}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              color: config.mode === m.key ? 'var(--accent)' : 'var(--text-secondary)',
              backgroundColor: config.mode === m.key ? 'var(--accent-dim)' : 'transparent',
              border: `1px solid ${config.mode === m.key ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {config.mode === 'year' && (
        <select
          value={config.year ?? years[0] ?? new Date().getFullYear()}
          onChange={e => onChange({ ...config, year: Number(e.target.value) })}
          style={{
            padding: '5px 10px',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {years.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      )}

      {config.mode === 'custom' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={config.startDate ?? ''}
            onChange={e => onChange({ ...config, startDate: e.target.value })}
            style={{
              padding: '4px 8px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 12,
              colorScheme: 'dark',
            }}
          />
          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>→</span>
          <input
            type="date"
            value={config.endDate ?? ''}
            onChange={e => onChange({ ...config, endDate: e.target.value })}
            style={{
              padding: '4px 8px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 12,
              colorScheme: 'dark',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Stats comparison table ────────────────────────────────────────────────────

interface StatRowProps {
  label: string
  valueA: string
  valueB: string
  delta?: number       // percentage delta (B vs A), undefined for non-numeric
  isNumeric?: boolean
}

function StatRow({ label, valueA, valueB, delta, isNumeric }: StatRowProps) {
  let deltaEl: React.ReactNode = null
  if (isNumeric && delta != null && isFinite(delta)) {
    const pos = delta >= 0
    const sign = pos ? '↑' : '↓'
    deltaEl = (
      <span style={{
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        color: pos ? 'var(--success)' : 'var(--danger)',
      }}>
        {sign} {Math.abs(delta).toFixed(0)}%
      </span>
    )
  } else if (valueA === valueB && valueA !== '—') {
    deltaEl = <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>same</span>
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: 12,
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'var(--text-primary)', textAlign: 'left' }}>
        {valueA}
      </div>
      <div style={{ textAlign: 'center', minWidth: 72 }}>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 2 }}>
          {label}
        </div>
        {deltaEl}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: 'var(--text-primary)', textAlign: 'right' }}>
        {valueB}
      </div>
    </div>
  )
}

function formatHours(h: number): string {
  if (h === 0) return '—'
  if (h >= 24) return `${Math.round(h / 24)}d`
  return `${Math.round(h)}h`
}

function pctDelta(a: number, b: number): number {
  if (a === 0) return b === 0 ? 0 : 100
  return ((b - a) / a) * 100
}

function StatsComparison({ a, b }: { a: PeriodStats; b: PeriodStats }) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 20px 8px',
    }}>
      <StatRow
        label="films"
        valueA={a.filmCount > 0 ? String(a.filmCount) : '—'}
        valueB={b.filmCount > 0 ? String(b.filmCount) : '—'}
        delta={pctDelta(a.filmCount, b.filmCount)}
        isNumeric
      />
      <StatRow
        label="hours"
        valueA={formatHours(a.hours)}
        valueB={formatHours(b.hours)}
        delta={a.hours > 0 ? pctDelta(a.hours, b.hours) : undefined}
        isNumeric
      />
      <StatRow
        label="avg rating"
        valueA={a.avgRating != null ? `${a.avgRating.toFixed(2)}★` : '—'}
        valueB={b.avgRating != null ? `${b.avgRating.toFixed(2)}★` : '—'}
        delta={a.avgRating != null && b.avgRating != null
          ? pctDelta(a.avgRating, b.avgRating)
          : undefined}
        isNumeric
      />
      <StatRow
        label="top genre"
        valueA={a.topGenre ?? '—'}
        valueB={b.topGenre ?? '—'}
      />
      <StatRow
        label="top director"
        valueA={a.topDirector ?? '—'}
        valueB={b.topDirector ?? '—'}
      />
      <StatRow
        label="top language"
        valueA={a.topLanguage ?? '—'}
        valueB={b.topLanguage ?? '—'}
      />
      <StatRow
        label="best day"
        valueA={a.mostWatchedDay ?? '—'}
        valueB={b.mostWatchedDay ?? '—'}
      />
    </div>
  )
}

// ── Period labels header ──────────────────────────────────────────────────────

function PeriodHeaders({ labelA, labelB }: { labelA: string; labelB: string }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: 12,
      marginBottom: 4,
    }}>
      <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 15, color: 'var(--accent)', textAlign: 'left' }}>
        {labelA}
      </div>
      <div style={{ minWidth: 72 }} />
      <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 15, color: 'var(--accent)', textAlign: 'right' }}>
        {labelB}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const DEFAULT_A: PeriodConfig = { mode: 'year', year: new Date().getFullYear() - 1 }
const DEFAULT_B: PeriodConfig = { mode: 'year', year: new Date().getFullYear() }

export default function ComparePage() {
  const [allFilms, setAllFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [periodA, setPeriodA] = useState<PeriodConfig>(DEFAULT_A)
  const [periodB, setPeriodB] = useState<PeriodConfig>(DEFAULT_B)

  useEffect(() => {
    getAllFilms().then(films => {
      setAllFilms(films)
      setLoading(false)
    })
  }, [])

  const years = useMemo(() => availableYears(allFilms), [allFilms])

  // Initialise year selectors to real years once data loads
  useEffect(() => {
    if (years.length >= 2) {
      setPeriodA(c => c.mode === 'year' && !c.year ? { ...c, year: years[1] } : c)
      setPeriodB(c => c.mode === 'year' && !c.year ? { ...c, year: years[0] } : c)
    }
  }, [years])

  const statsA = useMemo(() => {
    const [start, end] = periodRange(periodA)
    return computePeriodStats(allFilms, start, end)
  }, [allFilms, periodA])

  const statsB = useMemo(() => {
    const [start, end] = periodRange(periodB)
    return computePeriodStats(allFilms, start, end)
  }, [allFilms, periodB])

  if (loading) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>loading...</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 24px 40px', maxWidth: 700 }}>
      <h1 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)', marginBottom: 20 }}>
        Compare
      </h1>

      {/* Period selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <PeriodSelector config={periodA} years={years} onChange={setPeriodA} label="Period A" />
        <PeriodSelector config={periodB} years={years} onChange={setPeriodB} label="Period B" />
      </div>

      {/* No diary data at all */}
      {statsA.filmCount === 0 && statsB.filmCount === 0 && (
        <div style={{ padding: '24px 0', color: 'var(--text-dim)', fontSize: 13 }}>
          no diary entries found for either period — log some films on Letterboxd first
        </div>
      )}

      {/* Comparison table */}
      {(statsA.filmCount > 0 || statsB.filmCount > 0) && (
        <>
          <PeriodHeaders labelA={periodLabel(periodA)} labelB={periodLabel(periodB)} />
          <StatsComparison a={statsA} b={statsB} />
        </>
      )}

      {/* Tip */}
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 16, lineHeight: 1.5 }}>
        stats are computed from diary entries — films marked watched but not logged won't appear here
      </div>
    </div>
  )
}
