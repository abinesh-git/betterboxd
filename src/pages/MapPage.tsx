import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { getAllFilms } from '../lib/stats'
import type { CountryStat, Film } from '../types'
import WorldMap from '../components/map/WorldMap'

// ─── Country passport data ────────────────────────────────────────────────────
// Names match TMDB productionCountries. iso2 used for flag emoji.

const PASSPORT_COUNTRIES: { name: string; iso2: string }[] = [
  { name: 'United States of America', iso2: 'US' },
  { name: 'United Kingdom', iso2: 'GB' },
  { name: 'France', iso2: 'FR' },
  { name: 'Germany', iso2: 'DE' },
  { name: 'Italy', iso2: 'IT' },
  { name: 'Japan', iso2: 'JP' },
  { name: 'South Korea', iso2: 'KR' },
  { name: 'India', iso2: 'IN' },
  { name: 'Spain', iso2: 'ES' },
  { name: 'Canada', iso2: 'CA' },
  { name: 'Australia', iso2: 'AU' },
  { name: 'China', iso2: 'CN' },
  { name: 'Brazil', iso2: 'BR' },
  { name: 'Mexico', iso2: 'MX' },
  { name: 'Russia', iso2: 'RU' },
  { name: 'Sweden', iso2: 'SE' },
  { name: 'Denmark', iso2: 'DK' },
  { name: 'Norway', iso2: 'NO' },
  { name: 'Poland', iso2: 'PL' },
  { name: 'Netherlands', iso2: 'NL' },
  { name: 'Belgium', iso2: 'BE' },
  { name: 'Austria', iso2: 'AT' },
  { name: 'Switzerland', iso2: 'CH' },
  { name: 'Portugal', iso2: 'PT' },
  { name: 'Finland', iso2: 'FI' },
  { name: 'Czech Republic', iso2: 'CZ' },
  { name: 'Hungary', iso2: 'HU' },
  { name: 'Romania', iso2: 'RO' },
  { name: 'Greece', iso2: 'GR' },
  { name: 'Ireland', iso2: 'IE' },
  { name: 'Argentina', iso2: 'AR' },
  { name: 'Chile', iso2: 'CL' },
  { name: 'Colombia', iso2: 'CO' },
  { name: 'Peru', iso2: 'PE' },
  { name: 'Cuba', iso2: 'CU' },
  { name: 'Iran', iso2: 'IR' },
  { name: 'Turkey', iso2: 'TR' },
  { name: 'Israel', iso2: 'IL' },
  { name: 'Taiwan', iso2: 'TW' },
  { name: 'Hong Kong', iso2: 'HK' },
  { name: 'Thailand', iso2: 'TH' },
  { name: 'Indonesia', iso2: 'ID' },
  { name: 'Vietnam', iso2: 'VN' },
  { name: 'Malaysia', iso2: 'MY' },
  { name: 'Philippines', iso2: 'PH' },
  { name: 'Singapore', iso2: 'SG' },
  { name: 'Pakistan', iso2: 'PK' },
  { name: 'Bangladesh', iso2: 'BD' },
  { name: 'Sri Lanka', iso2: 'LK' },
  { name: 'Kazakhstan', iso2: 'KZ' },
  { name: 'Mongolia', iso2: 'MN' },
  { name: 'Myanmar', iso2: 'MM' },
  { name: 'Cambodia', iso2: 'KH' },
  { name: 'New Zealand', iso2: 'NZ' },
  { name: 'South Africa', iso2: 'ZA' },
  { name: 'Nigeria', iso2: 'NG' },
  { name: 'Egypt', iso2: 'EG' },
  { name: 'Morocco', iso2: 'MA' },
  { name: 'Algeria', iso2: 'DZ' },
  { name: 'Tunisia', iso2: 'TN' },
  { name: 'Senegal', iso2: 'SN' },
  { name: 'Kenya', iso2: 'KE' },
  { name: 'Ghana', iso2: 'GH' },
  { name: 'Ethiopia', iso2: 'ET' },
  { name: 'Ukraine', iso2: 'UA' },
  { name: 'Serbia', iso2: 'RS' },
  { name: 'Bulgaria', iso2: 'BG' },
  { name: 'Croatia', iso2: 'HR' },
  { name: 'Slovakia', iso2: 'SK' },
  { name: 'Iceland', iso2: 'IS' },
  { name: 'Luxembourg', iso2: 'LU' },
  { name: 'Georgia', iso2: 'GE' },
  { name: 'Armenia', iso2: 'AM' },
  { name: 'Azerbaijan', iso2: 'AZ' },
  { name: 'Lebanon', iso2: 'LB' },
  { name: 'Jordan', iso2: 'JO' },
  { name: 'Saudi Arabia', iso2: 'SA' },
  { name: 'United Arab Emirates', iso2: 'AE' },
]

function flag(iso2: string): string {
  return [...iso2.toUpperCase()]
    .map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

// ─── Letterboxd country slug helper ──────────────────────────────────────────

const LETTERBOXD_SLUG_OVERRIDES: Record<string, string> = {
  'United States of America': 'usa',
}

function countryToLetterboxdSlug(country: string): string {
  return LETTERBOXD_SLUG_OVERRIDES[country] ?? country.toLowerCase().replace(/\s+/g, '-')
}

// ─── Country side panel ───────────────────────────────────────────────────────

function CountryPanel({
  country,
  films,
  onClose,
}: {
  country: string
  films: Film[]
  onClose: () => void
}) {
  const sorted = useMemo(
    () => [...films].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [films]
  )

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--overlay)', zIndex: 40 }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 340,
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
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--border)',
            position: 'sticky',
            top: 0,
            backgroundColor: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'Clash Display, sans-serif',
                fontWeight: 600,
                fontSize: 15,
                color: 'var(--text-primary)',
              }}
            >
              {country}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
              {films.length} {films.length === 1 ? 'film' : 'films'} watched
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

        {/* Film list */}
        <div style={{ padding: '12px 20px 24px' }}>
          {sorted.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-dim)', paddingTop: 8 }}>
              No films found from this country.
            </p>
          ) : (
            sorted.map((film, i) => (
              <div
                key={film.uri}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingTop: i === 0 ? 4 : 8,
                  paddingBottom: 8,
                  borderBottom: i === sorted.length - 1 ? 'none' : '1px solid var(--border)',
                }}
              >
                {film.tmdbData?.posterPath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${film.tmdbData.posterPath}`}
                    alt=""
                    style={{ width: 30, height: 45, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: 30,
                      height: 45,
                      backgroundColor: 'var(--surface-raised)',
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {film.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                    {film.year}
                  </div>
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
            ))
          )}
        </div>
      </div>
    </>
  )
}

// ─── Country passport ─────────────────────────────────────────────────────────

function CountryPassport({
  countryFilmsMap,
  onCountryClick,
}: {
  countryFilmsMap: Map<string, Film[]>
  onCountryClick: (name: string) => void
}) {
  const [hoveredIso2, setHoveredIso2] = useState<string | null>(null)
  const visitedCount = PASSPORT_COUNTRIES.filter(c => countryFilmsMap.has(c.name)).length
  const total = PASSPORT_COUNTRIES.length

  return (
    <div style={{ padding: '28px 24px 40px' }}>
      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 20 }}>
        <h2
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 16,
            color: 'var(--text-primary)',
          }}
        >
          Country Passport
        </h2>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text-dim)' }}>
          {visitedCount} / {total}
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
          gap: 8,
        }}
      >
        {PASSPORT_COUNTRIES.map(c => {
          const films = countryFilmsMap.get(c.name)
          const count = films?.length ?? 0
          const isVisited = count > 0
          const isHovered = hoveredIso2 === c.iso2

          return (
            <button
              key={c.iso2}
              onClick={() => {
                if (isVisited) {
                  onCountryClick(c.name)
                } else {
                  window.open(
                    `https://letterboxd.com/films/country/${countryToLetterboxdSlug(c.name)}/`,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              }}
              title={
                isVisited
                  ? `${c.name} · ${count} ${count === 1 ? 'film' : 'films'}`
                  : `Explore ${c.name} on Letterboxd`
              }
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 4px',
                backgroundColor: isVisited
                  ? (isHovered ? 'var(--accent-dim)' : 'var(--surface-raised)')
                  : 'transparent',
                border: isVisited ? '1px solid var(--border)' : '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                opacity: isVisited ? 1 : (isHovered ? 0.55 : 0.22),
                transition: 'opacity 0.15s, background 0.15s',
                position: 'relative',
              }}
              onMouseEnter={() => setHoveredIso2(c.iso2)}
              onMouseLeave={() => setHoveredIso2(null)}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{flag(c.iso2)}</span>
              <span
                style={{
                  fontSize: 9,
                  color: isVisited ? 'var(--text-secondary)' : 'var(--text-dim)',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  width: '100%',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {c.name === 'United States of America' ? 'USA' : c.name}
              </span>
              {isVisited && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    fontSize: 8,
                    fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--accent)',
                    lineHeight: 1,
                  }}
                >
                  {count}
                </span>
              )}
              {!isVisited && isHovered && (
                <span
                  style={{
                    fontSize: 8,
                    color: 'var(--accent)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  explore →
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MapPage() {
  const [allFilms, setAllFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  useEffect(() => {
    getAllFilms().then(films => {
      setAllFilms(films)
      setLoading(false)
    })
  }, [])

  // Map: country name → films from that country
  const countryFilmsMap = useMemo(() => {
    const map = new Map<string, Film[]>()
    for (const film of allFilms) {
      for (const country of film.tmdbData?.productionCountries ?? []) {
        if (country === 'Antarctica') continue
        if (!map.has(country)) map.set(country, [])
        map.get(country)!.push(film)
      }
    }
    return map
  }, [allFilms])

  const countryStats = useMemo<CountryStat[]>(() => {
    return Array.from(countryFilmsMap.entries())
      .map(([country, films]) => ({ country, isoCode: '', count: films.length }))
      .sort((a, b) => b.count - a.count)
  }, [countryFilmsMap])

  const topCountry = countryStats[0] ?? null
  const totalCountries = countryStats.length

  const watchlistFromUnseen = useMemo(() => {
    const seenCountries = new Set(countryFilmsMap.keys())
    return allFilms.filter(f =>
      f.onWatchlist &&
      (f.tmdbData?.productionCountries ?? []).every(c => !seenCountries.has(c))
    ).length
  }, [allFilms, countryFilmsMap])

  const selectedFilms = useMemo(
    () => (selectedCountry ? (countryFilmsMap.get(selectedCountry) ?? []) : []),
    [selectedCountry, countryFilmsMap]
  )

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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Page heading + stats bar */}
      <div style={{ padding: '24px 24px 16px' }}>
        <h1
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 22,
            color: 'var(--text-primary)',
            marginBottom: 14,
          }}
        >
          Map
        </h1>

        {/* Stats bar */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <StatPill
            value={totalCountries.toString()}
            label="countries explored"
          />
          {topCountry && (
            <StatPill
              value={topCountry.country}
              label={`most watched · ${topCountry.count} films`}
            />
          )}
          {watchlistFromUnseen > 0 && (
            <StatPill
              value={watchlistFromUnseen.toString()}
              label="watchlist films from unexplored countries"
            />
          )}
        </div>
      </div>

      {/* World map — full width */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <WorldMap
          data={countryStats}
          onCountryClick={name => setSelectedCountry(name)}
        />
      </div>

      {/* Country Passport */}
      <CountryPassport
        countryFilmsMap={countryFilmsMap}
        onCountryClick={name => setSelectedCountry(name)}
      />

      {/* Country side panel */}
      {selectedCountry && (
        <CountryPanel
          country={selectedCountry}
          films={selectedFilms}
          onClose={() => setSelectedCountry(null)}
        />
      )}
    </div>
  )
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500,
          fontSize: 15,
          color: 'var(--text-primary)',
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</span>
    </div>
  )
}
