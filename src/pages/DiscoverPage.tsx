import { useEffect, useState } from 'react'
import { Construction } from 'lucide-react'
import { getAllFilms } from '../lib/stats'
import type { Film } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilmCard {
  uri: string
  title: string
  year: number
  posterPath?: string
  tmdbRating?: number
  runtime?: number
  genres: string[]
  daysSinceAdded?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filmType(f: Film): 'short' | 'feature' {
  const rt = f.tmdbData?.runtime
  if (rt != null && rt < 40) return 'short'
  return 'feature'
}

function toCard(f: Film): FilmCard {
  return {
    uri: f.uri,
    title: f.title,
    year: f.year,
    posterPath: f.tmdbData?.posterPath,
    tmdbRating: f.tmdbData?.tmdbRating,
    runtime: f.tmdbData?.runtime,
    genres: f.tmdbData?.genres ?? [],
  }
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

// ─── Poster ───────────────────────────────────────────────────────────────────

function Poster({ path, title }: { path?: string; title: string }) {
  return (
    <div
      style={{
        width: 80,
        height: 120,
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        flexShrink: 0,
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border)',
      }}
    >
      {path ? (
        <img
          src={`https://image.tmdb.org/t/p/w154${path}`}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-dim)',
            fontSize: 10,
            textAlign: 'center',
            padding: 4,
          }}
        >
          {title}
        </div>
      )}
    </div>
  )
}

// ─── Film card (grid item) ────────────────────────────────────────────────────

function DiscoverCard({ film, meta }: { film: FilmCard; meta?: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Poster path={film.posterPath} title={film.title} />
      <div style={{ padding: '8px 8px 10px' }}>
        <div
          style={{
            fontFamily: 'var(--font-display, inherit)',
            fontWeight: 600,
            fontSize: 12,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={film.title}
        >
          {film.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
          {film.year}
        </div>
        {film.tmdbRating != null && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {(film.tmdbRating / 2).toFixed(1)} / 5
          </div>
        )}
        {meta && (
          <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>
            {meta}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  count,
}: {
  title: string
  subtitle: string
  count?: number
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <h2
          style={{
            fontFamily: 'var(--font-display, inherit)',
            fontWeight: 600,
            fontSize: 16,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h2>
        {count != null && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-dim)',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {count}
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{subtitle}</p>
    </div>
  )
}

// ─── Film grid ────────────────────────────────────────────────────────────────

function FilmGrid({
  films,
  getMeta,
  max = 20,
}: {
  films: FilmCard[]
  getMeta?: (f: FilmCard) => string | undefined
  max?: number
}) {
  const [showAll, setShowAll] = useState(false)
  const shown = showAll ? films : films.slice(0, max)
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: 12,
        }}
      >
        {shown.map((f) => (
          <DiscoverCard key={f.uri} film={f} meta={getMeta?.(f)} />
        ))}
      </div>
      {!showAll && films.length > max && (
        <button
          onClick={() => setShowAll(true)}
          style={{
            marginTop: 14,
            padding: '6px 16px',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          show {films.length - max} more
        </button>
      )}
    </>
  )
}

// ─── Data interfaces ──────────────────────────────────────────────────────────

interface DiscoverData {
  blindSpots: Array<{ film: FilmCard; director: string }>
  unexploredCountries: string[]
  unexploredLanguages: string[]
  watchlistOldest: Array<{ film: FilmCard; days: number }>
  topGenres: string[]
}

// ─── Compute ──────────────────────────────────────────────────────────────────

async function computeDiscover(today: string): Promise<DiscoverData> {
  const films = await getAllFilms()
  const enriched = films.filter((f) => f.enriched && !f.enrichError && f.tmdbData)

  // Build director → watched films map (features only)
  const dirMap = new Map<string, Film[]>()
  for (const f of enriched) {
    if (filmType(f) !== 'feature') continue
    for (const d of f.tmdbData!.directors) {
      const arr = dirMap.get(d) ?? []
      arr.push(f)
      dirMap.set(d, arr)
    }
  }

  // Top 10 directors by watch count
  const top10dirs = Array.from(dirMap.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)

  // Blind spots: films from top directors the user hasn't logged
  // A "seen" film = has at least one diary entry OR is in watched list
  const watchedUris = new Set(films.map((f) => f.uri))
  const loggedTitleYears = new Set(
    films
      .filter((f) => f.diaryEntries.length > 0)
      .map((f) => `${f.title.toLowerCase()}|||${f.year}`)
  )

  const blindSpotsRaw: Array<{ film: FilmCard; director: string; rating: number }> = []
  for (const [director, dirFilms] of top10dirs) {
    // For each film from this director that the user HAS in their DB but hasn't diary-logged
    // (These are films watched but not logged, or just enriched)
    // Actually since DB only has films from the user's watched.csv, we can show
    // films the user watched but never diary-logged as "partially explored"
    // More useful: films enriched where diaryEntries is empty
    for (const f of dirFilms) {
      if (f.diaryEntries.length > 0) continue // already diary-logged
      if (!watchedUris.has(f.uri)) continue
      const key = `${f.title.toLowerCase()}|||${f.year}`
      if (loggedTitleYears.has(key)) continue
      const rating = f.tmdbData?.tmdbRating
      if (rating == null) continue
      blindSpotsRaw.push({ film: toCard(f), director, rating })
    }
  }
  // Sort by TMDB rating desc, dedup by film uri
  const seenUris = new Set<string>()
  const blindSpots: Array<{ film: FilmCard; director: string }> = []
  for (const item of blindSpotsRaw.sort((a, b) => b.rating - a.rating)) {
    if (seenUris.has(item.film.uri)) continue
    seenUris.add(item.film.uri)
    blindSpots.push({ film: item.film, director: item.director })
  }

  // Unexplored countries (zero diary-logged films)
  const loggedCountries = new Set<string>()
  for (const f of enriched) {
    if (f.diaryEntries.length === 0) continue
    for (const c of f.tmdbData!.productionCountries) loggedCountries.add(c)
  }
  const allCountries = new Set<string>()
  for (const f of enriched) {
    for (const c of f.tmdbData!.productionCountries) allCountries.add(c)
  }
  const unexploredCountries = Array.from(allCountries)
    .filter((c) => !loggedCountries.has(c))
    .sort()

  // Unexplored languages
  const loggedLanguages = new Set<string>()
  for (const f of enriched) {
    if (f.diaryEntries.length === 0) continue
    const lang = f.tmdbData!.originalLanguage
    if (lang) loggedLanguages.add(lang)
  }
  const allLanguages = new Set<string>()
  for (const f of enriched) {
    const lang = f.tmdbData!.originalLanguage
    if (lang) allLanguages.add(lang)
  }
  const unexploredLanguages = Array.from(allLanguages)
    .filter((l) => !loggedLanguages.has(l))
    .sort()

  // Watchlist oldest (films on watchlist but no diary entries)
  const watchlistOldestRaw = films
    .filter((f) => f.onWatchlist && f.watchlistDate && f.diaryEntries.length === 0)
    .map((f) => ({
      film: { ...toCard(f), daysSinceAdded: daysBetween(f.watchlistDate!, today) },
      days: daysBetween(f.watchlistDate!, today),
    }))
    .sort((a, b) => b.days - a.days)

  const watchlistOldest = watchlistOldestRaw.slice(0, 40)

  // Top genres (for genre blind spots label)
  const genreCount = new Map<string, number>()
  for (const f of enriched) {
    if (f.diaryEntries.length === 0) continue
    for (const g of f.tmdbData!.genres) genreCount.set(g, (genreCount.get(g) ?? 0) + 1)
  }
  const topGenres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g)

  return {
    blindSpots: blindSpots.slice(0, 40),
    unexploredCountries,
    unexploredLanguages,
    watchlistOldest,
    topGenres,
  }
}

// ─── Language name helper (inline — no import needed) ────────────────────────

const LANG: Record<string, string> = {
  en: 'English', fr: 'French', de: 'German', it: 'Italian', es: 'Spanish',
  pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  hi: 'Hindi', ar: 'Arabic', fa: 'Persian', tr: 'Turkish', pl: 'Polish',
  nl: 'Dutch', sv: 'Swedish', da: 'Danish', fi: 'Finnish', nb: 'Norwegian',
  cs: 'Czech', hu: 'Hungarian', ro: 'Romanian', el: 'Greek', he: 'Hebrew',
  id: 'Indonesian', ms: 'Malay', vi: 'Vietnamese', th: 'Thai', uk: 'Ukrainian',
  ca: 'Catalan', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', bn: 'Bengali',
  sr: 'Serbian', hr: 'Croatian', sk: 'Slovak', bg: 'Bulgarian', sl: 'Slovenian',
  lv: 'Latvian', lt: 'Lithuanian', et: 'Estonian', is: 'Icelandic', ga: 'Irish',
  cy: 'Welsh', eu: 'Basque', gl: 'Galician', af: 'Afrikaans', sw: 'Swahili',
  xx: 'No Language', cn: 'Cantonese',
}
function langName(code: string): string {
  return LANG[code] ?? code
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ padding: '0 0 40px' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ marginBottom: 48 }}>
          <div
            style={{
              width: 160,
              height: 18,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-raised)',
              marginBottom: 8,
            }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 12,
            }}
          >
            {[...Array(8)].map((_, j) => (
              <div
                key={j}
                style={{
                  height: 148,
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface-raised)',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const [data, setData] = useState<DiscoverData | null>(null)
  const [loading, setLoading] = useState(true)

  // Use a stable "today" string so no Date.now() at module level
  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    computeDiscover(today).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [today])

  return (
    <div className="p-6 md:p-8" style={{ maxWidth: 1200 }}>
      {/* WIP banner */}
      <div
        style={{
          background: 'var(--accent-dim)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <Construction size={16} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 2 }}>
            Work in progress
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Right now you can see blind spots from your top directors, films sitting on your
            watchlist, and unexplored countries and languages. Phase 2 brings taste-based
            recommendations from users with similar film profiles — that's when this page gets
            really interesting.
          </div>
        </div>
      </div>

      <h1
        className="font-display"
        style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}
      >
        Discover
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 40 }}>
        films you haven't explored yet, based on what you already love
      </p>

      {loading && <Skeleton />}

      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
          {/* Blind spots */}
          <section>
            <SectionHeader
              title="blind spots"
              subtitle={`films you've seen but never logged — from your top 10 most-watched directors`}
              count={data.blindSpots.length}
            />
            {data.blindSpots.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Nothing here — looks like you've diary-logged everything from your top directors.
              </p>
            ) : (
              <FilmGrid
                films={data.blindSpots.map((b) => b.film)}
                getMeta={(f) => {
                  const entry = data.blindSpots.find((b) => b.film.uri === f.uri)
                  return entry ? entry.director : undefined
                }}
              />
            )}
          </section>

          {/* Watchlist longest */}
          <section>
            <SectionHeader
              title="sitting on your watchlist"
              subtitle="films that have been waiting the longest — maybe today's the day"
              count={data.watchlistOldest.length}
            />
            {data.watchlistOldest.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Your watchlist is either empty or you've already watched everything on it.
              </p>
            ) : (
              <FilmGrid
                films={data.watchlistOldest.map((w) => w.film)}
                getMeta={(f) => {
                  const entry = data.watchlistOldest.find((w) => w.film.uri === f.uri)
                  if (!entry) return undefined
                  const yrs = Math.floor(entry.days / 365)
                  if (yrs >= 1) return `${yrs}y on watchlist`
                  const mos = Math.floor(entry.days / 30)
                  if (mos >= 1) return `${mos}mo on watchlist`
                  return `${entry.days}d on watchlist`
                }}
              />
            )}
          </section>

          {/* Unexplored countries */}
          <section>
            <SectionHeader
              title="countries you haven't explored"
              subtitle="production countries present in your watched list but with no diary entries"
              count={data.unexploredCountries.length}
            />
            {data.unexploredCountries.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                You've diary-logged films from every country in your watched list.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {data.unexploredCountries.map((c) => (
                  <span
                    key={c}
                    style={{
                      padding: '4px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Unexplored languages */}
          <section>
            <SectionHeader
              title="languages you haven't explored"
              subtitle="languages in your watched list but with no diary-logged films"
              count={data.unexploredLanguages.length}
            />
            {data.unexploredLanguages.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                You've diary-logged films in every language from your watched list.
              </p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.unexploredLanguages.map((l) => (
                  <span
                    key={l}
                    style={{
                      padding: '4px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {langName(l)}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
