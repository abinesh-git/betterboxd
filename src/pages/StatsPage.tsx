import { useEffect, useMemo, useState } from 'react'
import {
  genreStats, languageStats, countryStats, decadeStats, getAllFilms,
} from '../lib/stats'
import type { AttributeStat, CountryStat, DecadeStat, Film } from '../types'

type Tab = 'genre' | 'language' | 'country' | 'decade' | 'runtime'

const TABS: { key: Tab; label: string }[] = [
  { key: 'genre',    label: 'Genre' },
  { key: 'language', label: 'Language' },
  { key: 'country',  label: 'Country' },
  { key: 'decade',   label: 'Decade' },
  { key: 'runtime',  label: 'Runtime' },
]

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 11,
        fontFamily: 'Clash Display, sans-serif',
        fontWeight: 600,
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 16,
      }}
    >
      {children}
    </h2>
  )
}

function BarRow({
  label, count, maxCount, rating,
}: {
  label: string
  count: number
  maxCount: number
  rating?: number
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span
        style={{
          width: 130,
          flexShrink: 0,
          fontSize: 13,
          color: 'var(--text-secondary)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
        title={label}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          backgroundColor: 'var(--surface-raised)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(count / maxCount) * 100}%`,
            backgroundColor: 'var(--accent)',
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span
        style={{
          width: 38,
          flexShrink: 0,
          textAlign: 'right',
          fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-dim)',
        }}
      >
        {count}
      </span>
      {rating != null && (
        <span
          style={{
            width: 36,
            flexShrink: 0,
            textAlign: 'right',
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--accent)',
          }}
        >
          {rating.toFixed(1)}★
        </span>
      )}
    </div>
  )
}

function RankedRow({
  rank, label, rating, count,
}: {
  rank: number
  label: string
  rating: number
  count: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '9px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          width: 20,
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
          fontSize: 13,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--accent)',
        }}
      >
        {rating.toFixed(2)}★
      </span>
      <span
        style={{
          flexShrink: 0,
          fontSize: 11,
          color: 'var(--text-dim)',
          width: 54,
          textAlign: 'right',
        }}
      >
        {count} films
      </span>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>('genre')
  const [genreData, setGenreData]     = useState<AttributeStat[]>([])
  const [langData, setLangData]       = useState<AttributeStat[]>([])
  const [countryData, setCountryData] = useState<CountryStat[]>([])
  const [decadeData, setDecadeData]   = useState<DecadeStat[]>([])
  const [allFilms, setAllFilms]       = useState<Film[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      genreStats(),
      languageStats(),
      countryStats(),
      decadeStats(),
      getAllFilms(),
    ]).then(([g, l, c, d, films]) => {
      setGenreData(g)
      setLangData(l)
      setCountryData(c)
      setDecadeData(d)
      setAllFilms(films)
      setLoading(false)
    })
  }, [])

  // Runtime buckets computed from all films
  const runtimeData = useMemo<AttributeStat[]>(() => {
    const defs = [
      { name: 'Under 90 min',  test: (r: number) => r < 90 },
      { name: '90–120 min',    test: (r: number) => r >= 90 && r <= 120 },
      { name: '120–150 min',   test: (r: number) => r > 120 && r <= 150 },
      { name: '150+ min',      test: (r: number) => r > 150 },
    ]
    return defs.map(b => {
      const group = allFilms.filter(f => f.tmdbData?.runtime != null && b.test(f.tmdbData.runtime!))
      const rated = group.filter(f => f.rating != null)
      return {
        name: b.name,
        count: group.length,
        avgRating: rated.length >= 3
          ? rated.reduce((s, f) => s + f.rating!, 0) / rated.length
          : undefined,
      }
    }).filter(b => b.count > 0)
  }, [allFilms])

  // Overall avg rating (for insight delta)
  const overallAvg = useMemo(() => {
    const rated = allFilms.filter(f => f.rating != null)
    if (!rated.length) return 0
    return rated.reduce((s, f) => s + f.rating!, 0) / rated.length
  }, [allFilms])

  // Flatten current tab to AttributeStat[]
  const tabData = useMemo<AttributeStat[]>(() => {
    switch (tab) {
      case 'genre':    return genreData
      case 'language': return langData
      case 'country':  return countryData.map(c => ({ name: c.country, count: c.count }))
      case 'decade':   return decadeData.map(d => ({ name: d.decade, count: d.count, avgRating: d.avgRating }))
      case 'runtime':  return runtimeData
    }
  }, [tab, genreData, langData, countryData, decadeData, runtimeData])

  const topByCount  = useMemo(() => tabData.slice(0, 10), [tabData])
  const maxCount    = Math.max(...topByCount.map(d => d.count), 1)

  const topByRating = useMemo(() => {
    if (tab === 'country') return []
    return [...tabData]
      .filter(d => d.avgRating != null && d.count >= 3)
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
      .slice(0, 10)
  }, [tab, tabData])

  const insight = useMemo<string | null>(() => {
    if (!overallAvg || !topByRating.length) return null
    const best = topByRating[0]
    if (!best?.avgRating) return null
    const delta = best.avgRating - overallAvg
    if (Math.abs(delta) < 0.05) return null
    const dir = delta > 0 ? 'above' : 'below'
    return `You rate ${best.name} ${Math.abs(delta).toFixed(1)}★ ${dir} your overall average`
  }, [topByRating, overallAvg])

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
    <div style={{ padding: '24px 24px 40px', maxWidth: 900 }}>
      {/* Page heading */}
      <h1
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--text-primary)',
          marginBottom: 24,
        }}
      >
        Stats
      </h1>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 28,
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

      {/* Insight callout */}
      {insight && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)',
            fontSize: 13,
            color: 'var(--text-primary)',
            marginBottom: 24,
          }}
        >
          {insight}
        </div>
      )}

      {/* Two-column layout: most watched + highest rated */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: topByRating.length ? '1fr 1fr' : '1fr',
          gap: 24,
        }}
        className="md:grid-cols-2 grid-cols-1"
      >
        {/* Most watched */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 20px 12px',
          }}
        >
          <SectionTitle>Most watched</SectionTitle>
          {topByCount.map(d => (
            <BarRow
              key={d.name}
              label={d.name}
              count={d.count}
              maxCount={maxCount}
            />
          ))}
          {topByCount.length === 0 && (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No data yet.</p>
          )}
        </div>

        {/* Highest rated */}
        {topByRating.length > 0 && (
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 20px 12px',
            }}
          >
            <SectionTitle>Highest rated</SectionTitle>
            {topByRating.map((d, i) => (
              <RankedRow
                key={d.name}
                rank={i + 1}
                label={d.name}
                rating={d.avgRating!}
                count={d.count}
              />
            ))}
          </div>
        )}
      </div>

      {/* Country note */}
      {tab === 'country' && (
        <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 16 }}>
          Average rating per country not yet computed — visit the Map page for country detail.
        </p>
      )}
    </div>
  )
}
