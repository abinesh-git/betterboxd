import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { db } from '../db'
import { genreStats, countryStats, directorStats, ratingDistribution } from '../lib/stats'
import type { CountryStat, RatingBucket, Film } from '../types'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatWatchTime(minutes: number): { value: string; unit: string } {
  const hours = Math.round(minutes / 60)
  if (hours > 365) return { value: Math.round(hours / 24).toLocaleString(), unit: 'days' }
  return { value: hours.toLocaleString(), unit: 'hours' }
}

interface RecentEntry {
  film: Film
  watchedDate: string
  rating?: number
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

  useEffect(() => {
    async function load() {
      const [rd, genres, ctry, directors, allFilms] = await Promise.all([
        ratingDistribution(),
        genreStats(),
        countryStats(),
        directorStats(),
        db.films.toArray(),
      ])

      setRatingDist(rd)
      setTopGenre(genres[0]?.name ?? null)
      setTopDirector(directors[0]?.name ?? null)
      setUniqueCountries((ctry as CountryStat[]).length)

      const totalMinutes = allFilms.reduce((sum, f) => sum + (f.tmdbData?.runtime ?? 0), 0)
      if (totalMinutes > 0) setWatchTime(formatWatchTime(totalMinutes))

      const totalRated = rd.reduce((s, d) => s + d.count, 0)
      const totalWeighted = rd.reduce((s, d) => s + d.rating * d.count, 0)
      if (totalRated > 0) setAvgRating((totalWeighted / totalRated).toFixed(2))

      const entries = allFilms
        .flatMap(f => f.diaryEntries.map(d => ({
          film: f,
          watchedDate: d.watchedDate,
          rating: d.rating ?? f.rating,
        })))
        .filter(e => e.watchedDate)
        .sort((a, b) => b.watchedDate.localeCompare(a.watchedDate))
        .slice(0, 5)
      setRecentEntries(entries)
    }
    load()
  }, [])

  const maxRatingCount = Math.max(...ratingDist.map(d => d.count), 1)
  const username = profile?.username

  const heroStats = [
    { label: 'films watched', value: totalFilms.toLocaleString() },
    { label: watchTime?.unit ?? 'hours', value: watchTime?.value ?? '—' },
    { label: 'countries', value: uniqueCountries > 0 ? uniqueCountries.toLocaleString() : '—' },
    { label: 'avg rating', value: avgRating },
    { label: 'day streak', value: '—' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <h1
          className="font-display font-semibold"
          style={{ fontSize: 22, color: 'var(--text-primary)' }}
        >
          {getGreeting()}{username ? `, @${username}` : ''}
        </h1>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {heroStats.map(stat => (
          <div
            key={stat.label}
            className="p-4"
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="font-mono font-medium"
              style={{ fontSize: 24, color: 'var(--text-primary)', lineHeight: 1.2 }}
            >
              {stat.value}
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Recent watches */}
        <div
          className="p-5"
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
          }}
        >
          <h2
            className="font-display font-semibold uppercase tracking-wider mb-4"
            style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}
          >
            Recent watches
          </h2>
          <div className="space-y-3">
            {recentEntries.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                No diary entries yet — start logging on Letterboxd.
              </p>
            ) : (
              recentEntries.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  {e.film.tmdbData?.posterPath ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w92${e.film.tmdbData.posterPath}`}
                      alt={e.film.title}
                      style={{
                        width: 28,
                        aspectRatio: '2/3',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-sm)',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      className="flex-shrink-0"
                      style={{
                        width: 28,
                        aspectRatio: '2/3',
                        backgroundColor: 'var(--surface-raised)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm truncate"
                      style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                    >
                      {e.film.title}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      {e.film.year}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {e.rating && (
                      <div className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                        {e.rating}★
                      </div>
                    )}
                    <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      {new Date(e.watchedDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Rating distribution */}
        <div
          className="p-5"
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
          }}
        >
          <h2
            className="font-display font-semibold uppercase tracking-wider mb-4"
            style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}
          >
            Rating distribution
          </h2>
          {ratingDist.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              No ratings yet.
            </p>
          ) : (
            <div className="space-y-2">
              {[...ratingDist].reverse().map(d => (
                <div key={d.rating} className="flex items-center gap-3">
                  <span
                    className="font-mono text-xs flex-shrink-0 text-right"
                    style={{ color: 'var(--text-dim)', width: 28 }}
                  >
                    {d.rating}
                  </span>
                  <div
                    className="flex-1"
                    style={{
                      backgroundColor: 'var(--surface-raised)',
                      borderRadius: 3,
                      height: 6,
                    }}
                  >
                    <div
                      style={{
                        width: `${(d.count / maxRatingCount) * 100}%`,
                        backgroundColor: 'var(--accent)',
                        borderRadius: 3,
                        height: 6,
                        transition: 'width 0.4s ease',
                        opacity: 0.85 + (d.count / maxRatingCount) * 0.15,
                      }}
                    />
                  </div>
                  <span
                    className="font-mono text-xs flex-shrink-0 text-right"
                    style={{ color: 'var(--text-dim)', width: 36 }}
                  >
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          className="p-4"
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
            top genre
          </div>
          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {topGenre ?? '—'}
          </div>
        </div>
        <div
          className="p-4"
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
            directors you keep coming back to
          </div>
          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {topDirector ?? '—'}
          </div>
        </div>
        <div
          className="p-4"
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="text-xs mb-1" style={{ color: 'var(--text-dim)' }}>
            countries explored
          </div>
          <div
            className="font-mono font-medium text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            {uniqueCountries > 0 ? uniqueCountries : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
