import { useEffect, useMemo, useState } from 'react'
import { Film as FilmIcon, Clock, Globe, Star, Flame } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '../store'
import {
  ratingDistribution,
  genreStats,
  countryStats,
  directorStats,
  mostRewatchedFilms,
  getAllFilms,
} from '../lib/stats'
import type { RatingBucket, Film } from '../types'

// ─── Star label map ───────────────────────────────────────────────────────────

const STAR_LABELS: Record<number, string> = {
  0.5: '½★', 1: '1★', 1.5: '1½★', 2: '2★', 2.5: '2½★',
  3: '3★', 3.5: '3½★', 4: '4★', 4.5: '4½★', 5: '5★',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatWatchTime(minutes: number): { value: string; unit: string } {
  const hours = Math.round(minutes / 60)
  if (hours > 365 * 24) return { value: Math.round(hours / 24).toLocaleString(), unit: 'days' }
  return { value: hours.toLocaleString(), unit: 'hours' }
}

function computeCurrentStreak(films: Film[]): number {
  const days = new Set<string>()
  for (const film of films) {
    for (const entry of film.diaryEntries) {
      if (entry.watchedDate) days.add(entry.watchedDate.slice(0, 10))
    }
  }
  if (!days.size) return 0

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cursor = new Date(today)

  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: LucideIcon }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px 18px',
        minWidth: 0,
      }}
    >
      <Icon size={16} style={{ color: 'var(--text-dim)', marginBottom: 6, display: 'block' }} />
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 500,
          fontSize: 26,
          color: 'var(--text-primary)',
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 11,
          color: 'var(--text-dim)',
          textTransform: 'lowercase',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: 'Clash Display, sans-serif',
        fontWeight: 600,
        fontSize: 11,
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface RecentEntry {
  film: Film
  watchedDate: string
  rating?: number
}

interface RewatchGroup {
  films: { film: Film; count: number }[]
  count: number
}

export default function OverviewPage() {
  const { profile, totalFilms } = useAppStore()

  const [ratingDist, setRatingDist] = useState<RatingBucket[]>([])
  const [topGenre, setTopGenre] = useState<string | null>(null)
  const [topDirector, setTopDirector] = useState<string | null>(null)
  const [uniqueCountries, setUniqueCountries] = useState(0)
  const [watchTime, setWatchTime] = useState<{ value: string; unit: string } | null>(null)
  const [avgRating, setAvgRating] = useState('—')
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([])
  const [streak, setStreak] = useState(0)
  const [topRewatch, setTopRewatch] = useState<RewatchGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [backdropFilms, setBackdropFilms] = useState<Film[]>([])

  useEffect(() => {
    async function load() {
      const [rd, genres, ctry, directors, rewatched, allFilms] = await Promise.all([
        ratingDistribution(),
        genreStats(),
        countryStats(),
        directorStats(),
        mostRewatchedFilms(),
        getAllFilms(),
      ])

      setRatingDist(rd)
      setTopGenre(genres[0]?.name ?? null)
      setTopDirector(directors[0]?.name ?? null)
      setUniqueCountries(ctry.length)

      if (rewatched.length > 0) {
        const maxCount = rewatched[0].rewatchCount
        const tied = rewatched.filter(r => r.rewatchCount === maxCount)
        setTopRewatch({
          films: tied.map(r => ({ film: r.film, count: r.rewatchCount })),
          count: maxCount,
        })
      }

      const totalMinutes = allFilms.reduce((s, f) => s + (f.tmdbData?.runtime ?? 0), 0)
      if (totalMinutes > 0) setWatchTime(formatWatchTime(totalMinutes))

      const totalRated = rd.reduce((s, d) => s + d.count, 0)
      const totalWeighted = rd.reduce((s, d) => s + d.rating * d.count, 0)
      if (totalRated > 0) setAvgRating((totalWeighted / totalRated).toFixed(2))

      setStreak(computeCurrentStreak(allFilms))

      const entries = allFilms
        .flatMap(f =>
          f.diaryEntries.map(d => ({
            film: f,
            watchedDate: d.watchedDate,
            rating: d.rating ?? f.rating,
          }))
        )
        .filter(e => e.watchedDate)
        .sort((a, b) => b.watchedDate.localeCompare(a.watchedDate))
        .slice(0, 5)
      setRecentEntries(entries)
      setLoading(false)

      // Build backdrop from favorite films in profile, fall back to highest-rated
      const favUris = profile?.favoriteFilmUris ?? []
      const candidates: Film[] = []
      const usedUris = new Set<string>()
      for (const uri of favUris.slice(0, 4)) {
        const film = allFilms.find(f => f.uri === uri && f.tmdbData?.backdropPath)
        if (film && !usedUris.has(film.uri)) { candidates.push(film); usedUris.add(film.uri) }
      }
      if (candidates.length < 4) {
        const fallbacks = allFilms
          .filter(f => f.rating != null && f.rating >= 4.5 && f.tmdbData?.backdropPath && !usedUris.has(f.uri) && f.diaryEntries.length === 1)
          .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        for (const f of fallbacks) {
          if (candidates.length >= 4) break
          candidates.push(f); usedUris.add(f.uri)
        }
      }
      setBackdropFilms(candidates.slice(0, 4))
    }
    load()
  }, [])

  const maxRatingCount = useMemo(
    () => Math.max(...ratingDist.map(d => d.count), 1),
    [ratingDist]
  )

  const username = profile?.username

  const heroStats: { label: string; value: string; icon: LucideIcon }[] = [
    { label: 'films watched', value: totalFilms > 0 ? totalFilms.toLocaleString() : '—', icon: FilmIcon },
    { label: watchTime?.unit ?? 'hours', value: watchTime?.value ?? '—', icon: Clock },
    { label: 'countries', value: uniqueCountries > 0 ? uniqueCountries.toLocaleString() : '—', icon: Globe },
    { label: 'avg rating', value: avgRating, icon: Star },
    { label: 'day streak', value: streak > 0 ? streak.toLocaleString() : '—', icon: Flame },
  ]

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
    <div>
      {/* Backdrop strip — full bleed */}
      {backdropFilms.length > 0 && (
        <div style={{ display: 'flex', height: 200, overflow: 'hidden' }}>
          {backdropFilms.map(film => (
            <div
              key={film.uri}
              style={{
                flex: 1,
                backgroundImage: `url(https://image.tmdb.org/t/p/w780${film.tmdbData!.backdropPath})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.65))' }} />
              <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Inter, sans-serif' }}>
                  {film.title}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Main content */}
      <div style={{ padding: '24px 24px 40px', maxWidth: 960 }}>
      {/* Greeting */}
      <h1
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--text-primary)',
          marginBottom: 20,
        }}
      >
        {getGreeting()}{username ? `, @${username}` : ''}
      </h1>

      {/* Hero stat row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 10,
          marginBottom: 20,
        }}
      >
        {heroStats.map(s => (
          <StatCard key={s.label} value={s.value} label={s.label} icon={s.icon} />
        ))}
      </div>

      {/* Two-column: recent watches + rating distribution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Recent watches */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
          }}
        >
          <SectionLabel>Recent watches</SectionLabel>
          {recentEntries.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              No diary entries yet — start logging on Letterboxd.
            </p>
          ) : (
            recentEntries.map((e, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingTop: i === 0 ? 0 : 10,
                  paddingBottom: i === recentEntries.length - 1 ? 0 : 10,
                  borderBottom: i === recentEntries.length - 1 ? 'none' : '1px solid var(--border)',
                }}
              >
                {e.film.tmdbData?.posterPath ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w92${e.film.tmdbData.posterPath}`}
                    alt=""
                    style={{ width: 30, height: 45, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 30, height: 45, borderRadius: 3, backgroundColor: 'var(--surface-raised)', flexShrink: 0 }} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {e.film.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                    {e.film.year}
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  {e.rating != null && (
                    <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
                      {e.rating.toFixed(1)}★
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>
                    {formatDate(e.watchedDate)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rating distribution — vertical histogram */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
          }}
        >
          <SectionLabel>Rating distribution</SectionLabel>
          {ratingDist.filter(d => d.count > 0).length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No ratings yet.</p>
          ) : (
            <>
              {/* Bars */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 4,
                  height: 110,
                }}
              >
                {ratingDist.map(d => (
                  <div
                    key={d.rating}
                    style={{
                      flex: 1,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${(d.count / maxRatingCount) * 100}%`,
                        backgroundColor: 'var(--accent)',
                        borderRadius: '2px 2px 0 0',
                        opacity: d.count > 0 ? 0.55 + (d.count / maxRatingCount) * 0.45 : 0,
                        transition: 'height 0.4s ease',
                        minHeight: d.count > 0 ? 2 : 0,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* X-axis labels */}
              <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                {ratingDist.map(d => (
                  <div
                    key={d.rating}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 9,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--text-dim)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    {STAR_LABELS[d.rating] ?? d.rating}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick highlights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        <HighlightCard label="directors you keep coming back to" value={topDirector ?? '—'} />
        <HighlightCard label="top genre" value={topGenre ?? '—'} />

        {/* Most rewatched — horizontal scrollable row when tied */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'lowercase' }}>
            {topRewatch ? `most rewatched · ${topRewatch.count} watches` : 'most rewatched'}
          </div>
          {topRewatch ? (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {topRewatch.films.map(({ film }) => (
                <div key={film.uri} style={{ flexShrink: 0, width: 45 }}>
                  {film.tmdbData?.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${film.tmdbData.posterPath}`}
                      alt=""
                      style={{ width: 45, height: 67, objectFit: 'cover', borderRadius: 3, display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: 45, height: 67, backgroundColor: 'var(--surface-raised)', borderRadius: 3 }} />
                  )}
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-primary)',
                      marginTop: 3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 45,
                    }}
                  >
                    {film.title}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>—</div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

function HighlightCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'lowercase' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
