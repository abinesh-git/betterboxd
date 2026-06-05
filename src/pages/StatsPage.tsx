import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown } from 'lucide-react'
import { getAllFilms, filterFilmsByType, languageName } from '../lib/stats'
import { useAppStore } from '../store'
import type { Film } from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = 'year' | 'decade' | 'genre' | 'language' | 'country' | 'runtime'

const TABS: { key: Tab; label: string }[] = [
  { key: 'year',     label: 'Release Year' },
  { key: 'decade',   label: 'Decades' },
  { key: 'genre',    label: 'Genre' },
  { key: 'language', label: 'Language' },
  { key: 'country',  label: 'Country' },
  { key: 'runtime',  label: 'Runtime' },
]

const CONTINENT_ORDER = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania']

const COUNTRY_TO_CONTINENT: Record<string, string> = {
  // Africa
  Algeria: 'Africa', Angola: 'Africa', Benin: 'Africa', Botswana: 'Africa',
  'Burkina Faso': 'Africa', Burundi: 'Africa', Cameroon: 'Africa', 'Cape Verde': 'Africa',
  'Central African Republic': 'Africa', Chad: 'Africa', Comoros: 'Africa', Congo: 'Africa',
  'Democratic Republic of the Congo': 'Africa', Djibouti: 'Africa', Egypt: 'Africa',
  'Equatorial Guinea': 'Africa', Eritrea: 'Africa', Ethiopia: 'Africa', Gabon: 'Africa',
  Gambia: 'Africa', Ghana: 'Africa', Guinea: 'Africa', 'Guinea-Bissau': 'Africa',
  "Côte d'Ivoire": 'Africa', 'Ivory Coast': 'Africa', Kenya: 'Africa', Lesotho: 'Africa',
  Liberia: 'Africa', Libya: 'Africa', Madagascar: 'Africa', Malawi: 'Africa',
  Mali: 'Africa', Mauritania: 'Africa', Mauritius: 'Africa', Morocco: 'Africa',
  Mozambique: 'Africa', Namibia: 'Africa', Niger: 'Africa', Nigeria: 'Africa',
  Rwanda: 'Africa', Senegal: 'Africa', 'Sierra Leone': 'Africa', Somalia: 'Africa',
  'South Africa': 'Africa', 'South Sudan': 'Africa', Sudan: 'Africa', Eswatini: 'Africa',
  Tanzania: 'Africa', Togo: 'Africa', Tunisia: 'Africa', Uganda: 'Africa',
  Zambia: 'Africa', Zimbabwe: 'Africa',
  // Asia
  Afghanistan: 'Asia', Armenia: 'Asia', Azerbaijan: 'Asia', Bahrain: 'Asia',
  Bangladesh: 'Asia', Bhutan: 'Asia', Brunei: 'Asia', Cambodia: 'Asia',
  China: 'Asia', Cyprus: 'Asia', Georgia: 'Asia', 'Hong Kong': 'Asia',
  India: 'Asia', Indonesia: 'Asia', Iran: 'Asia', Iraq: 'Asia',
  Israel: 'Asia', Japan: 'Asia', Jordan: 'Asia', Kazakhstan: 'Asia',
  Kuwait: 'Asia', Kyrgyzstan: 'Asia', Laos: 'Asia', Lebanon: 'Asia',
  Macau: 'Asia', Malaysia: 'Asia', Maldives: 'Asia', Mongolia: 'Asia',
  Myanmar: 'Asia', Nepal: 'Asia', 'North Korea': 'Asia', Oman: 'Asia',
  Pakistan: 'Asia', Palestine: 'Asia', Philippines: 'Asia', Qatar: 'Asia',
  'Saudi Arabia': 'Asia', Singapore: 'Asia', 'South Korea': 'Asia',
  'Sri Lanka': 'Asia', Syria: 'Asia', Taiwan: 'Asia', Tajikistan: 'Asia',
  Thailand: 'Asia', 'Timor-Leste': 'Asia', Turkey: 'Asia', Turkmenistan: 'Asia',
  'United Arab Emirates': 'Asia', Uzbekistan: 'Asia', Vietnam: 'Asia', Yemen: 'Asia',
  // Europe
  Albania: 'Europe', Andorra: 'Europe', Austria: 'Europe', Belarus: 'Europe',
  Belgium: 'Europe', 'Bosnia and Herzegovina': 'Europe', Bulgaria: 'Europe',
  Croatia: 'Europe', 'Czech Republic': 'Europe', Czechia: 'Europe',
  Denmark: 'Europe', Estonia: 'Europe', Finland: 'Europe', France: 'Europe',
  Germany: 'Europe', Greece: 'Europe', Hungary: 'Europe', Iceland: 'Europe',
  Ireland: 'Europe', Italy: 'Europe', Kosovo: 'Europe', Latvia: 'Europe',
  Liechtenstein: 'Europe', Lithuania: 'Europe', Luxembourg: 'Europe',
  Malta: 'Europe', Moldova: 'Europe', Monaco: 'Europe', Montenegro: 'Europe',
  Netherlands: 'Europe', 'North Macedonia': 'Europe', Norway: 'Europe',
  Poland: 'Europe', Portugal: 'Europe', Romania: 'Europe', Russia: 'Europe',
  'San Marino': 'Europe', Serbia: 'Europe', Slovakia: 'Europe',
  Slovenia: 'Europe', Spain: 'Europe', Sweden: 'Europe', Switzerland: 'Europe',
  Ukraine: 'Europe', 'United Kingdom': 'Europe',
  // North America
  'Antigua and Barbuda': 'North America', Bahamas: 'North America',
  Barbados: 'North America', Belize: 'North America', Canada: 'North America',
  'Costa Rica': 'North America', Cuba: 'North America', Dominica: 'North America',
  'Dominican Republic': 'North America', 'El Salvador': 'North America',
  Grenada: 'North America', Guatemala: 'North America', Haiti: 'North America',
  Honduras: 'North America', Jamaica: 'North America', Mexico: 'North America',
  Nicaragua: 'North America', Panama: 'North America',
  'Trinidad and Tobago': 'North America', 'United States of America': 'North America',
  // South America
  Argentina: 'South America', Bolivia: 'South America', Brazil: 'South America',
  Chile: 'South America', Colombia: 'South America', Ecuador: 'South America',
  Guyana: 'South America', Paraguay: 'South America', Peru: 'South America',
  Suriname: 'South America', Uruguay: 'South America', Venezuela: 'South America',
  // Oceania
  Australia: 'Oceania', Fiji: 'Oceania', 'New Zealand': 'Oceania',
  'Papua New Guinea': 'Oceania', Samoa: 'Oceania', 'Solomon Islands': 'Oceania',
  Tonga: 'Oceania', Vanuatu: 'Oceania',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(films: Film[]): number | undefined {
  const rated = films.filter(f => f.rating != null)
  if (rated.length < 3) return undefined
  return rated.reduce((s, f) => s + f.rating!, 0) / rated.length
}

function topPosters(films: Film[], n = 3): (string | null)[] {
  return [...films]
    .filter(f => f.rating != null && f.tmdbData?.posterPath)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, n)
    .map(f => f.tmdbData?.posterPath ?? null)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ fontSize: 11, fontFamily: 'Clash Display, sans-serif', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {children}
      </h2>
      {action}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function PosterStrip({ paths }: { paths: (string | null)[] }) {
  return (
    <div style={{ display: 'flex', marginTop: 8 }}>
      {paths.map((path, i) =>
        path ? (
          <img
            key={i}
            src={`https://image.tmdb.org/t/p/w92${path}`}
            alt=""
            style={{
              width: 40, height: 60, objectFit: 'cover',
              borderRadius: 3,
              marginLeft: i > 0 ? -10 : 0,
              border: '2px solid var(--surface)',
              display: 'block',
            }}
          />
        ) : (
          <div
            key={i}
            style={{
              width: 40, height: 60,
              backgroundColor: 'var(--surface-raised)',
              borderRadius: 3,
              marginLeft: i > 0 ? -10 : 0,
              border: '2px solid var(--surface)',
            }}
          />
        )
      )}
    </div>
  )
}

// Vertical bar chart (year / decade)
function VerticalBars({
  items, mode,
}: {
  items: { label: string; count: number; avgRating?: number }[]
  mode: 'count' | 'rating'
}) {
  const vals = items.map(d => mode === 'count' ? d.count : (d.avgRating ?? 0))
  const maxVal = Math.max(...vals, 0.01)
  const CHART_H = 140
  const barW = Math.max(4, Math.min(20, Math.floor(560 / Math.max(items.length, 1)) - 3))
  const showEvery = items.length > 40 ? 10 : items.length > 20 ? 5 : 1

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: CHART_H, minWidth: items.length * (barW + 3) }}>
        {items.map((d, i) => {
          const val = mode === 'count' ? d.count : (d.avgRating ?? 0)
          const h = val > 0 ? Math.max(2, (val / maxVal) * (CHART_H - 4)) : 0
          const showLabel = i % showEvery === 0
          return (
            <div
              key={d.label}
              title={`${d.label}: ${mode === 'count' ? d.count : d.avgRating?.toFixed(2) ?? '—'}`}
              style={{ position: 'relative', flexShrink: 0, width: barW, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
            >
              <div style={{
                width: '100%', height: h,
                backgroundColor: 'var(--accent)',
                borderRadius: '2px 2px 0 0',
                opacity: val > 0 ? 0.75 : 0.12,
              }} />
              {showLabel && (
                <div style={{
                  position: 'absolute',
                  bottom: -22,
                  left: '50%',
                  fontSize: 9,
                  color: 'var(--text-dim)',
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'nowrap',
                  transform: 'translateX(-50%) rotate(-40deg)',
                  transformOrigin: 'top center',
                }}>
                  {d.label}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Genre bubble chart (SVG)
function BubbleChart({ groups }: { groups: { genre: string; films: Film[] }[] }) {
  const CHART_H = 240
  const COL_W = 46
  const CAP = 30

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        width={groups.length * COL_W + 10}
        height={CHART_H + 40}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {groups.map((g, gi) => {
          const cx = gi * COL_W + COL_W / 2
          const display = g.films.slice(0, CAP)
          const extra = g.films.length - CAP

          const circles: { cy: number; r: number; op: number }[] = []
          let yBot = CHART_H - 2
          for (const film of display) {
            const r = film.rating != null ? 2 + ((film.rating - 0.5) / 4.5) * 6 : 3
            const cy = yBot - r
            circles.push({ cy, r, op: film.rating != null ? 0.3 + (film.rating / 5) * 0.7 : 0.15 })
            yBot = cy - r - 1.5
            if (yBot < 2) break
          }

          const topY = circles.length > 0
            ? circles[circles.length - 1].cy - circles[circles.length - 1].r - 6
            : CHART_H - 10

          return (
            <g key={g.genre}>
              {circles.map((c, ci) => (
                <circle
                  key={ci}
                  cx={cx} cy={c.cy} r={c.r}
                  style={{ fill: 'var(--accent)', fillOpacity: c.op }}
                />
              ))}
              {extra > 0 && (
                <text
                  x={cx} y={Math.max(topY, 8)}
                  textAnchor="middle" fontSize={8}
                  style={{ fill: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  +{extra}
                </text>
              )}
              <text
                x={0} y={0}
                textAnchor="end" fontSize={10}
                style={{ fill: 'var(--text-dim)' }}
                transform={`translate(${cx + 5}, ${CHART_H + 16}) rotate(-40)`}
              >
                {g.genre.length > 10 ? g.genre.slice(0, 9) + '…' : g.genre}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function SimpleBarRow({ label, count, maxCount, rating }: { label: string; count: number; maxCount: number; rating?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ width: 130, flexShrink: 0, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }} title={label}>
        {label}
      </span>
      <div style={{ flex: 1, height: 6, backgroundColor: 'var(--surface-raised)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, backgroundColor: 'var(--accent)', borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ width: 38, flexShrink: 0, textAlign: 'right', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>
        {count}
      </span>
      {rating != null && (
        <span style={{ width: 38, flexShrink: 0, textAlign: 'right', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
          {rating.toFixed(1)}★
        </span>
      )}
    </div>
  )
}

function RankedItem({ rank, label, rating, count }: { rank: number; label: string; rating: number; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ width: 18, flexShrink: 0, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', textAlign: 'right' }}>{rank}</span>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ flexShrink: 0, fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{rating.toFixed(2)}★</span>
      <span style={{ width: 50, flexShrink: 0, textAlign: 'right', fontSize: 11, color: 'var(--text-dim)' }}>{count} films</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const [tab, setTab] = useState<Tab>('year')
  const [yearMode, setYearMode]       = useState<'count' | 'rating'>('count')
  const [decadeMode, setDecadeMode]   = useState<'count' | 'rating'>('count')
  const [langSortAsc, setLangSortAsc] = useState(false)
  const [allFilms, setAllFilms]       = useState<Film[]>([])
  const [loading, setLoading]         = useState(true)

  const { filmTypeFilter } = useAppStore()

  useEffect(() => {
    getAllFilms().then(films => {
      setAllFilms(films)
      setLoading(false)
    })
  }, [])

  const filteredFilms = useMemo(
    () => filterFilmsByType(allFilms, filmTypeFilter),
    [allFilms, filmTypeFilter]
  )

  // ── Year data ──────────────────────────────────────────────────────────────
  const yearData = useMemo(() => {
    const map = new Map<number, Film[]>()
    for (const f of filteredFilms) {
      if (!f.year) continue
      const arr = map.get(f.year) ?? []; arr.push(f); map.set(f.year, arr)
    }
    return Array.from(map.entries())
      .map(([year, films]) => ({ label: String(year), count: films.length, avgRating: avg(films), films }))
      .sort((a, b) => Number(a.label) - Number(b.label))
  }, [filteredFilms])

  const topYears = useMemo(() =>
    [...yearData].filter(d => d.avgRating != null)
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)).slice(0, 3)
  , [yearData])

  // ── Decade data ────────────────────────────────────────────────────────────
  const decadeData = useMemo(() => {
    const map = new Map<string, Film[]>()
    for (const f of filteredFilms) {
      if (!f.year) continue
      const d = `${Math.floor(f.year / 10) * 10}s`
      const arr = map.get(d) ?? []; arr.push(f); map.set(d, arr)
    }
    return Array.from(map.entries())
      .map(([label, films]) => ({ label, count: films.length, avgRating: avg(films), films }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [filteredFilms])

  const topDecades = useMemo(() =>
    [...decadeData].filter(d => d.avgRating != null)
      .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)).slice(0, 3)
  , [decadeData])

  // ── Genre data ─────────────────────────────────────────────────────────────
  const genreGroups = useMemo(() => {
    const map = new Map<string, Film[]>()
    for (const f of filteredFilms) {
      for (const g of f.tmdbData?.genres ?? []) {
        const arr = map.get(g) ?? []; arr.push(f); map.set(g, arr)
      }
    }
    return Array.from(map.entries())
      .map(([genre, films]) => ({ genre, films, count: films.length, avgRating: avg(films) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 18)
  }, [filteredFilms])

  const genreRanked = useMemo(() => {
    const withRating = genreGroups.filter(g => g.avgRating != null)
    return {
      highest: [...withRating].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)).slice(0, 5),
      lowest:  [...withRating].sort((a, b) => (a.avgRating ?? 0) - (b.avgRating ?? 0)).slice(0, 5),
    }
  }, [genreGroups])

  // ── Language data ──────────────────────────────────────────────────────────
  const langData = useMemo(() => {
    const map = new Map<string, Film[]>()
    for (const f of filteredFilms) {
      const code = f.tmdbData?.originalLanguage
      if (!code) continue
      const name = languageName(code)
      const arr = map.get(name) ?? []; arr.push(f); map.set(name, arr)
    }
    return Array.from(map.entries())
      .map(([name, films]) => ({ name, count: films.length, avgRating: avg(films) }))
      .sort((a, b) => b.count - a.count)
  }, [filteredFilms])

  const langRated = useMemo(() =>
    [...langData].filter(d => d.avgRating != null)
      .sort((a, b) => langSortAsc
        ? (a.avgRating ?? 0) - (b.avgRating ?? 0)
        : (b.avgRating ?? 0) - (a.avgRating ?? 0))
      .slice(0, 10)
  , [langData, langSortAsc])

  // ── Country data ───────────────────────────────────────────────────────────
  const countryData = useMemo(() => {
    const map = new Map<string, Film[]>()
    for (const f of filteredFilms) {
      for (const c of f.tmdbData?.productionCountries ?? []) {
        const arr = map.get(c) ?? []; arr.push(f); map.set(c, arr)
      }
    }
    return Array.from(map.entries())
      .map(([country, films]) => ({ name: country, count: films.length, avgRating: avg(films) }))
      .sort((a, b) => b.count - a.count)
  }, [filteredFilms])

  const continentData = useMemo(() => {
    const map = new Map<string, Film[]>()
    for (const f of filteredFilms) {
      const conts = new Set<string>()
      for (const c of f.tmdbData?.productionCountries ?? []) {
        conts.add(COUNTRY_TO_CONTINENT[c] ?? 'Other')
      }
      for (const cont of conts) {
        const arr = map.get(cont) ?? []; arr.push(f); map.set(cont, arr)
      }
    }
    return CONTINENT_ORDER.map(cont => {
      const films = map.get(cont) ?? []
      return { label: cont, count: films.length, avgRating: avg(films) }
    }).filter(d => d.count > 0)
  }, [filteredFilms])

  const continentMaxCount = Math.max(...continentData.map(d => d.count), 1)

  const continentRanked = useMemo(() =>
    [...continentData].filter(d => d.avgRating != null).sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
  , [continentData])

  // ── Runtime data ───────────────────────────────────────────────────────────
  const runtimeData = useMemo(() => {
    const defs = [
      { name: 'Under 90 min',  test: (r: number) => r > 0 && r < 90 },
      { name: '90–120 min',    test: (r: number) => r >= 90 && r <= 120 },
      { name: '120–150 min',   test: (r: number) => r > 120 && r <= 150 },
      { name: '150–180 min',   test: (r: number) => r > 150 && r <= 180 },
      { name: '180+ min',      test: (r: number) => r > 180 },
    ]
    return defs.map(b => {
      const group = filteredFilms.filter(f => f.tmdbData?.runtime != null && b.test(f.tmdbData.runtime!))
      return { name: b.name, count: group.length, avgRating: avg(group) }
    }).filter(b => b.count > 0)
  }, [filteredFilms])

  const runtimeMax = Math.max(...runtimeData.map(d => d.count), 1)

  if (loading) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>loading...</span>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '24px 24px 40px', maxWidth: 960 }}>
      <h1 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)', marginBottom: 24 }}>
        Stats
      </h1>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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

      {/* ── Year tab ── */}
      {tab === 'year' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          <Card>
            <SectionTitle
              action={
                <ModeToggle mode={yearMode} onChange={setYearMode} />
              }
            >
              Films by release year
            </SectionTitle>
            <VerticalBars items={yearData} mode={yearMode} />
          </Card>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'Clash Display, sans-serif', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Top 3 highest rated
            </div>
            {topYears.map(d => (
              <div key={d.label} style={{ marginBottom: 20, padding: '14px 16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{d.avgRating?.toFixed(2)}★</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{d.count} films</div>
                <PosterStrip paths={topPosters(d.films)} />
              </div>
            ))}
            {topYears.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Rate more films to see top years.</p>}
          </div>
        </div>
      )}

      {/* ── Decade tab ── */}
      {tab === 'decade' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          <Card>
            <SectionTitle action={<ModeToggle mode={decadeMode} onChange={setDecadeMode} />}>
              Films by decade
            </SectionTitle>
            <VerticalBars items={decadeData} mode={decadeMode} />
          </Card>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'Clash Display, sans-serif', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Top 3 highest rated
            </div>
            {topDecades.map(d => (
              <div key={d.label} style={{ marginBottom: 20, padding: '14px 16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.label}</span>
                  <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>{d.avgRating?.toFixed(2)}★</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{d.count} films</div>
                <PosterStrip paths={topPosters(d.films)} />
              </div>
            ))}
            {topDecades.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Rate more films to see top decades.</p>}
          </div>
        </div>
      )}

      {/* ── Genre tab ── */}
      {tab === 'genre' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 20 }}>
          <Card>
            <SectionTitle>Genre bubble chart</SectionTitle>
            {genreGroups.length === 0
              ? <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No genre data yet.</p>
              : <BubbleChart groups={genreGroups} />
            }
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <SectionTitle>Highest rated</SectionTitle>
              {genreRanked.highest.map((g, i) => (
                <RankedItem key={g.genre} rank={i + 1} label={g.genre} rating={g.avgRating!} count={g.count} />
              ))}
              {genreRanked.highest.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Rate more films.</p>}
            </Card>
            <Card>
              <SectionTitle>Lowest rated</SectionTitle>
              {genreRanked.lowest.map((g, i) => (
                <RankedItem key={g.genre} rank={i + 1} label={g.genre} rating={g.avgRating!} count={g.count} />
              ))}
              {genreRanked.lowest.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Rate more films.</p>}
            </Card>
          </div>
        </div>
      )}

      {/* ── Language tab ── */}
      {tab === 'language' && (
        <>
          {/* Big stat */}
          <div style={{ marginBottom: 24, padding: '20px 24px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', display: 'inline-block' }}>
            <div style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 64, color: 'var(--accent)', lineHeight: 1 }}>
              {langData.length}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              languages
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card>
              <SectionTitle>Most watched</SectionTitle>
              {langData.length === 0
                ? <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No language data yet.</p>
                : langData.map(d => (
                    <SimpleBarRow key={d.name} label={d.name} count={d.count} maxCount={langData[0]?.count ?? 1} rating={d.avgRating} />
                  ))
              }
            </Card>
            <Card>
              <SectionTitle
                action={
                  <button
                    onClick={() => setLangSortAsc(v => !v)}
                    title={langSortAsc ? 'Showing lowest rated' : 'Showing highest rated'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2, display: 'flex', alignItems: 'center' }}
                  >
                    <ArrowUpDown size={14} />
                  </button>
                }
              >
                {langSortAsc ? 'Lowest rated' : 'Highest rated'}
              </SectionTitle>
              {langRated.length === 0
                ? <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Rate more films.</p>
                : langRated.map((d, i) => (
                    <RankedItem key={d.name} rank={i + 1} label={d.name} rating={d.avgRating!} count={d.count} />
                  ))
              }
            </Card>
          </div>
        </>
      )}

      {/* ── Country tab ── */}
      {tab === 'country' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Link to="/map" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
              view on map →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <Card>
              <SectionTitle>Most watched</SectionTitle>
              {countryData.slice(0, 15).map(d => (
                <SimpleBarRow key={d.name} label={d.name} count={d.count} maxCount={countryData[0]?.count ?? 1} />
              ))}
              {countryData.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No data yet.</p>}
            </Card>
            <Card>
              <SectionTitle>Highest rated</SectionTitle>
              {countryData.filter(d => d.avgRating != null).sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)).slice(0, 10)
                .map((d, i) => <RankedItem key={d.name} rank={i + 1} label={d.name} rating={d.avgRating!} count={d.count} />)
              }
              {countryData.filter(d => d.avgRating != null).length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Rate more films.</p>}
            </Card>
          </div>

          {/* Continents */}
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Continents</SectionTitle>
            {continentData.map(d => (
              <SimpleBarRow key={d.label} label={d.label} count={d.count} maxCount={continentMaxCount} rating={d.avgRating} />
            ))}
            {continentData.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No continent data yet.</p>}
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'lowercase' }}>highest rated continent</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{continentRanked[0]?.label ?? '—'}</div>
              {continentRanked[0] && <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', marginTop: 2 }}>{continentRanked[0].avgRating?.toFixed(2)}★</div>}
            </div>
            <div style={{ padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'lowercase' }}>lowest rated continent</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{continentRanked[continentRanked.length - 1]?.label ?? '—'}</div>
              {continentRanked.length > 0 && <div style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', marginTop: 2 }}>{continentRanked[continentRanked.length - 1].avgRating?.toFixed(2)}★</div>}
            </div>
          </div>
        </>
      )}

      {/* ── Runtime tab ── */}
      {tab === 'runtime' && (
        <Card>
          <SectionTitle>Runtime breakdown</SectionTitle>
          {runtimeData.length === 0
            ? <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No runtime data yet.</p>
            : runtimeData.map(d => (
                <SimpleBarRow key={d.name} label={d.name} count={d.count} maxCount={runtimeMax} rating={d.avgRating} />
              ))
          }
        </Card>
      )}
    </div>
  )
}

// ─── Mode toggle (Count / Rating) ─────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: 'count' | 'rating'; onChange: (m: 'count' | 'rating') => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {(['count', 'rating'] as const).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: '3px 8px', fontSize: 11, fontWeight: 500,
            color: mode === m ? 'var(--accent)' : 'var(--text-dim)',
            backgroundColor: mode === m ? 'var(--accent-dim)' : 'transparent',
            border: `1px solid ${mode === m ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            transition: 'color 0.12s ease',
          }}
        >
          {m === 'count' ? 'Count' : 'Rating'}
        </button>
      ))}
    </div>
  )
}
