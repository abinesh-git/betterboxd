import { useEffect, useMemo, useState } from 'react'
import { getAllFilms } from '../lib/stats'
import type { Film } from '../types'

// ── Chart types ────────────────────────────────────────────────────────────────

type ChartDef =
  | { type: 'comparison'; rows: { label: string; value: number; unit: string }[] }
  | { type: 'bars'; items: { label: string; value: number }[]; unit: string }
  | { type: 'stat'; value: string; sublabel: string }

// ── Insight shape ──────────────────────────────────────────────────────────────

interface Insight {
  id: string
  category: string
  statement: string
  detail: string
  chart: ChartDef
  strength: number // higher = more interesting
}

// ── Computation helpers ────────────────────────────────────────────────────────

function ratedEnriched(films: Film[]) {
  return films.filter(f => f.rating != null && f.tmdbData != null)
}

function filmAvg(films: Film[]): number | undefined {
  const r = films.filter(f => f.rating != null)
  if (!r.length) return undefined
  return r.reduce((s, f) => s + f.rating!, 0) / r.length
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}

// ── Individual insight computers ───────────────────────────────────────────────

function insightDirectorLoyalty(films: Film[]): Insight | null {
  const dirMap = new Map<string, Film[]>()
  for (const f of films) {
    if (f.rating == null) continue
    for (const d of f.tmdbData?.directors ?? []) {
      if (!dirMap.has(d)) dirMap.set(d, [])
      dirMap.get(d)!.push(f)
    }
  }

  const loyalFilms: Film[] = []
  const casualFilms: Film[] = []

  for (const [, dFilms] of dirMap) {
    if (dFilms.length >= 3) loyalFilms.push(...dFilms)
    else casualFilms.push(...dFilms)
  }

  if (loyalFilms.length < 10 || casualFilms.length < 10) return null

  const loyalAvg = filmAvg(loyalFilms)!
  const casualAvg = filmAvg(casualFilms)!
  const delta = loyalAvg - casualAvg
  if (Math.abs(delta) < 0.05) return null

  const dirCount = [...dirMap.values()].filter(d => d.length >= 3).length
  const statement = delta > 0
    ? `you rate directors you keep coming back to ${Math.abs(delta).toFixed(2)}★ higher than one-timers`
    : `you're actually more critical of directors you return to — ${Math.abs(delta).toFixed(2)}★ lower on average`

  return {
    id: 'director-loyalty',
    category: 'Director Loyalty',
    statement,
    detail: `across ${dirCount} directors you've seen 3+ films from (${loyalFilms.length} films total)`,
    chart: {
      type: 'comparison',
      rows: [
        { label: '3+ films', value: loyalAvg, unit: '★' },
        { label: '1-2 films', value: casualAvg, unit: '★' },
      ],
    },
    strength: Math.abs(delta) * 30 + dirCount * 0.2,
  }
}

function insightSeasonalPattern(films: Film[]): Insight | null {
  const counts = { Winter: 0, Spring: 0, Summer: 0, Autumn: 0 }
  for (const f of films) {
    for (const e of f.diaryEntries) {
      if (!e.watchedDate) continue
      const m = new Date(e.watchedDate).getMonth() + 1
      if (m === 12 || m <= 2) counts.Winter++
      else if (m <= 5) counts.Spring++
      else if (m <= 8) counts.Summer++
      else counts.Autumn++
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (total < 40) return null

  const entries = Object.entries(counts) as [keyof typeof counts, number][]
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const [maxName, maxVal] = sorted[0]
  const [minName, minVal] = sorted[sorted.length - 1]
  if (minVal === 0) return null

  const ratio = Math.round(((maxVal - minVal) / minVal) * 100)
  if (ratio < 15) return null

  return {
    id: 'seasonal',
    category: 'Seasonal Patterns',
    statement: `you watch ${ratio}% more films in ${maxName.toLowerCase()} than ${minName.toLowerCase()}`,
    detail: `across ${total} diary entries`,
    chart: {
      type: 'bars',
      items: entries.map(([name, value]) => ({ label: name, value })),
      unit: 'films',
    },
    strength: ratio * 0.5,
  }
}

function insightRatingVsTmdb(films: Film[]): Insight | null {
  const re = ratedEnriched(films).filter(f => f.tmdbData!.tmdbRating != null)
  if (re.length < 20) return null

  const diffs = re.map(f => f.rating! - f.tmdbData!.tmdbRating! / 2)
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
  if (Math.abs(avg) < 0.1) return null

  const yourAvg = filmAvg(re)!
  const tmdbAvg = re.reduce((s, f) => s + f.tmdbData!.tmdbRating! / 2, 0) / re.length

  const statement = avg > 0.2
    ? `you're ${avg.toFixed(2)}★ more generous than the TMDB consensus`
    : avg < -0.2
      ? `you're ${Math.abs(avg).toFixed(2)}★ harsher than the TMDB consensus`
      : `your ratings closely mirror the TMDB consensus — within ${Math.abs(avg).toFixed(2)}★`

  return {
    id: 'rating-vs-tmdb',
    category: 'Your Ratings vs the World',
    statement,
    detail: `across ${re.length} rated films with TMDB data`,
    chart: {
      type: 'comparison',
      rows: [
        { label: 'your avg', value: yourAvg, unit: '★' },
        { label: 'TMDB avg', value: tmdbAvg, unit: '★' },
      ],
    },
    strength: Math.abs(avg) * 25 + Math.sqrt(re.length) * 0.5,
  }
}

function insightHiddenGems(films: Film[]): Insight | null {
  const re = ratedEnriched(films).filter(f => f.tmdbData!.tmdbRating != null)
  if (re.length < 20) return null

  const gems = re.filter(f => f.rating! - f.tmdbData!.tmdbRating! / 2 >= 1.0)
  const pct = Math.round((gems.length / re.length) * 100)
  if (gems.length < 3) return null

  const topGems = [...gems]
    .sort((a, b) => (a.rating! - a.tmdbData!.tmdbRating! / 2) - (b.rating! - b.tmdbData!.tmdbRating! / 2))
    .reverse()
    .slice(0, 3)

  return {
    id: 'hidden-gems',
    category: 'Films You Rated Higher Than the World',
    statement: `you've given ${gems.length} films at least 1★ more than the TMDB consensus — you spot things others miss`,
    detail: `top example: "${topGems[0].title}" — you: ${topGems[0].rating}★, world: ${(topGems[0].tmdbData!.tmdbRating! / 2).toFixed(1)}★`,
    chart: {
      type: 'stat',
      value: `${gems.length}`,
      sublabel: `films rated 1★+ above TMDB avg (${pct}% of your rated films)`,
    },
    strength: pct * 0.8 + gems.length * 0.3,
  }
}

function insightComfortZone(films: Film[]): Insight | null {
  const enriched = films.filter(f => f.tmdbData?.genres?.length)
  if (enriched.length < 40) return null

  const genreCount = new Map<string, number>()
  for (const f of enriched)
    for (const g of f.tmdbData!.genres)
      genreCount.set(g, (genreCount.get(g) ?? 0) + 1)

  const top3 = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g)

  const inZone = enriched.filter(f => f.tmdbData!.genres.some(g => top3.includes(g))).length
  const pct = Math.round((inZone / enriched.length) * 100)

  const statement = pct >= 75
    ? `${pct}% of what you watch falls into your top 3 genres — you know what you like and stick to it`
    : pct >= 55
      ? `${pct}% of your watches are in your top 3 genres — a healthy mix of comfort and curiosity`
      : `only ${pct}% of your watches are in your top 3 genres — you're a genuine explorer`

  return {
    id: 'comfort-zone',
    category: 'Comfort Zone Score',
    statement,
    detail: `top genres: ${top3.join(', ')}`,
    chart: {
      type: 'stat',
      value: `${pct}%`,
      sublabel: 'of watches in your top 3 genres',
    },
    strength: Math.abs(pct - 65) * 0.8, // interesting if far from average
  }
}

function insightRewatchRate(films: Film[]): Insight | null {
  const diaryFilms = films.filter(f => f.diaryEntries.length > 0)
  if (diaryFilms.length < 50) return null

  const rewatchFilms = diaryFilms.filter(f => f.diaryEntries.some(e => e.rewatch))
  const pct = Math.round((rewatchFilms.length / diaryFilms.length) * 100)
  const totalRewatches = films.reduce((s, f) => s + Math.max(0, f.diaryEntries.length - 1), 0)

  const statement = pct >= 20
    ? `${pct}% of your logged films you've watched more than once — you invest in films you love`
    : pct >= 10
      ? `${pct}% of what you log are rewatches — films worth coming back to`
      : `only ${pct}% of your logs are rewatches — you're always looking for something new`

  return {
    id: 'rewatch-rate',
    category: 'Rewatch Habit',
    statement,
    detail: `${totalRewatches} rewatch logs across ${diaryFilms.length} diary entries`,
    chart: {
      type: 'stat',
      value: `${pct}%`,
      sublabel: 'of logged films rewatched at least once',
    },
    strength: Math.abs(pct - 12) * 1.2,
  }
}

function insightReleaseGap(films: Film[]): Insight | null {
  const gaps = films
    .map(f => f.releaseToWatchGapDays)
    .filter((g): g is number => g != null && g >= 0 && g < 36500) // sanity: under 100 years

  if (gaps.length < 20) return null

  const med = Math.round(median(gaps))

  let statement: string
  let strength: number
  if (med < 14) {
    statement = `you watch films within ${med} days of release on average — you're always first in line`
    strength = (14 - med) * 3
  } else if (med < 90) {
    statement = `you tend to watch films within ${med} days of release — an early adopter`
    strength = (90 - med) * 0.5
  } else if (med < 365) {
    statement = `your median watch is ${Math.round(med / 30)} months after release — you're patient but not slow`
    strength = 8
  } else {
    const years = (med / 365).toFixed(1)
    statement = `you typically watch films ${years} years after they come out — a slow-burner at heart`
    strength = med / 200
  }

  return {
    id: 'release-gap',
    category: 'Release-to-Watch Gap',
    statement,
    detail: `based on ${gaps.length} films with release date data`,
    chart: {
      type: 'stat',
      value: med < 365
        ? `${med}d`
        : `${(med / 365).toFixed(1)}y`,
      sublabel: 'median gap between release and your first watch',
    },
    strength,
  }
}

function insightBingeSessions(films: Film[]): Insight | null {
  const dayMap = new Map<string, number>()
  for (const f of films)
    for (const e of f.diaryEntries)
      if (e.watchedDate) {
        const d = e.watchedDate.slice(0, 10)
        dayMap.set(d, (dayMap.get(d) ?? 0) + 1)
      }

  const total = dayMap.size
  if (total < 30) return null

  const bingeDays = [...dayMap.values()].filter(c => c >= 3).length
  const pct = Math.round((bingeDays / total) * 100)
  if (pct < 3) return null

  const maxDay = Math.max(...dayMap.values())

  return {
    id: 'binge-sessions',
    category: 'Binge Watching',
    statement: pct >= 15
      ? `${pct}% of your watching days you logged 3+ films — you go deep when you sit down`
      : `${bingeDays} of your diary days were proper binge sessions (3+ films) — your record is ${maxDay} in a day`,
    detail: `across ${total} days with at least one diary entry`,
    chart: {
      type: 'stat',
      value: `${bingeDays}`,
      sublabel: `binge days (3+ films) out of ${total} active watching days`,
    },
    strength: pct * 0.9,
  }
}

// ── Pick top N free insights ───────────────────────────────────────────────────

function computeFreeInsights(films: Film[], n = 3): Insight[] {
  const candidates = [
    insightDirectorLoyalty(films),
    insightRatingVsTmdb(films),
    insightSeasonalPattern(films),
    insightHiddenGems(films),
    insightComfortZone(films),
    insightRewatchRate(films),
    insightReleaseGap(films),
    insightBingeSessions(films),
  ].filter((i): i is Insight => i !== null)

  return candidates
    .sort((a, b) => b.strength - a.strength)
    .slice(0, n)
}

// ── Gated insights (computed but blurred) ─────────────────────────────────────

interface GatedInsight {
  id: string
  category: string
  previewStatement: string // shown as blurred text, can be real
  chart: ChartDef
}

function computeGatedInsights(films: Film[]): GatedInsight[] {
  const enriched = films.filter(f => f.tmdbData != null && f.rating != null)

  // 1. Rating personality type
  let personalityType = 'Contrarian'
  let personalityDetail = 'you consistently rate films below the TMDB consensus'
  if (enriched.length >= 20) {
    const diffs = enriched
      .filter(f => f.tmdbData!.tmdbRating != null)
      .map(f => f.rating! - f.tmdbData!.tmdbRating! / 2)
    if (diffs.length >= 20) {
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
      const variance = diffs.reduce((s, d) => s + (d - avg) ** 2, 0) / diffs.length
      const stdev = Math.sqrt(variance)
      if (avg > 0.3) { personalityType = 'Champion'; personalityDetail = 'you rate films higher than the world does' }
      else if (avg > -0.1 && stdev < 0.6) { personalityType = 'Validator'; personalityDetail = 'your taste aligns closely with the consensus' }
      else if (stdev > 0.9) { personalityType = 'Explorer'; personalityDetail = 'your ratings scatter widely — independent taste' }
    }
  }

  // 2. Taste drift (top genre per year for last 4 years)
  const yearGenres = new Map<number, Map<string, number>>()
  for (const f of enriched) {
    for (const e of f.diaryEntries) {
      if (!e.watchedDate) continue
      const yr = new Date(e.watchedDate).getFullYear()
      if (!yearGenres.has(yr)) yearGenres.set(yr, new Map())
      for (const g of f.tmdbData!.genres ?? []) {
        const gm = yearGenres.get(yr)!
        gm.set(g, (gm.get(g) ?? 0) + 1)
      }
    }
  }
  const recentYears = [...yearGenres.keys()].sort((a, b) => b - a).slice(0, 4)
  const yearTopGenres = recentYears.map(yr => {
    const gm = yearGenres.get(yr)!
    const top = [...gm.entries()].sort((a, b) => b[1] - a[1])[0]
    return { year: yr, genre: top?.[0] ?? '—', count: top?.[1] ?? 0 }
  })

  // 3. Director loyalty full list (top 5 by avg rating)
  const dirRatings = new Map<string, { sum: number; count: number }>()
  for (const f of enriched)
    for (const d of f.tmdbData!.directors ?? []) {
      const cur = dirRatings.get(d) ?? { sum: 0, count: 0 }
      dirRatings.set(d, { sum: cur.sum + f.rating!, count: cur.count + 1 })
    }
  const loyalDirs = [...dirRatings.entries()]
    .filter(([, v]) => v.count >= 3)
    .map(([name, v]) => ({ name, avg: v.sum / v.count, count: v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  // 4. Watchlist procrastination
  const oldWatchlist = films
    .filter(f => f.onWatchlist && f.watchlistDate && f.diaryEntries.length === 0)
    .map(f => ({
      title: f.title,
      daysOn: Math.round((Date.now() - new Date(f.watchlistDate!).getTime()) / 86_400_000),
      tmdbRating: f.tmdbData?.tmdbRating,
    }))
    .filter(f => f.daysOn > 365)
    .sort((a, b) => b.daysOn - a.daysOn)
    .slice(0, 3)

  // 5. Hidden genres (genres with 0 films watched despite being popular)
  const watchedGenres = new Set<string>()
  for (const f of enriched)
    for (const g of f.tmdbData!.genres ?? [])
      watchedGenres.add(g)
  const allGenres = ['Action', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama',
    'Fantasy', 'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction', 'Thriller', 'War', 'Western']
  const unexplored = allGenres.filter(g => !watchedGenres.has(g)).slice(0, 4)

  return [
    {
      id: 'gated-personality',
      category: 'Rating Personality',
      previewStatement: `you are a ${personalityType} — ${personalityDetail}`,
      chart: {
        type: 'stat',
        value: personalityType,
        sublabel: personalityDetail,
      },
    },
    {
      id: 'gated-taste-drift',
      category: 'Taste Drift',
      previewStatement: recentYears.length >= 2
        ? `your top genre shifted from ${yearTopGenres[yearTopGenres.length - 1].genre} to ${yearTopGenres[0].genre} over ${recentYears.length} years`
        : 'how your taste in genres has shifted year over year',
      chart: {
        type: 'bars',
        items: yearTopGenres.map(y => ({ label: String(y.year), value: y.count })),
        unit: 'films',
      },
    },
    {
      id: 'gated-director-loyalty',
      category: 'Director Loyalty Scores',
      previewStatement: loyalDirs.length > 0
        ? `your most championed director: ${loyalDirs[0].name} at ${loyalDirs[0].avg.toFixed(2)}★ avg`
        : 'which directors you rate above the world',
      chart: {
        type: 'comparison',
        rows: loyalDirs.slice(0, 3).map(d => ({ label: d.name.split(' ').pop()!, value: d.avg, unit: '★' })),
      },
    },
    {
      id: 'gated-watchlist-procrastination',
      category: 'Watchlist Procrastination',
      previewStatement: oldWatchlist.length > 0
        ? `"${oldWatchlist[0].title}" has been on your watchlist for ${Math.round(oldWatchlist[0].daysOn / 365)} years`
        : 'films that have been sitting on your watchlist the longest',
      chart: {
        type: 'stat',
        value: String(oldWatchlist.length),
        sublabel: 'films sitting on your watchlist for over a year',
      },
    },
    {
      id: 'gated-unexplored',
      category: 'Genre Blind Spots',
      previewStatement: unexplored.length > 0
        ? `you've never watched a ${unexplored[0]} film — there's a whole world waiting`
        : "major genres you haven't explored yet",
      chart: {
        type: 'bars',
        items: unexplored.map(g => ({ label: g, value: 0 })),
        unit: '',
      },
    },
  ]
}

// ── Mini chart ─────────────────────────────────────────────────────────────────

function MiniChart({ chart }: { chart: ChartDef }) {
  if (chart.type === 'stat') {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 700,
          fontSize: 36,
          color: 'var(--accent)',
          lineHeight: 1,
          marginBottom: 6,
        }}>
          {chart.value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4 }}>
          {chart.sublabel}
        </div>
      </div>
    )
  }

  if (chart.type === 'comparison') {
    const max = Math.max(...chart.rows.map(r => r.value), 0.001)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chart.rows.map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 72, flexShrink: 0, fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>
              {row.label}
            </div>
            <div style={{ flex: 1, height: 6, backgroundColor: 'var(--surface-raised)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${(row.value / max) * 100}%`,
                height: '100%',
                backgroundColor: 'var(--accent)',
                borderRadius: 3,
              }} />
            </div>
            <div style={{ width: 36, flexShrink: 0, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
              {row.value.toFixed(2)}{row.unit}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (chart.type === 'bars') {
    const max = Math.max(...chart.items.map(i => i.value), 1)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {chart.items.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 56, flexShrink: 0, fontSize: 11, color: 'var(--text-dim)' }}>
              {item.label}
            </div>
            <div style={{ flex: 1, height: 5, backgroundColor: 'var(--surface-raised)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${(item.value / max) * 100}%`,
                height: '100%',
                backgroundColor: 'var(--accent)',
                borderRadius: 3,
                opacity: 0.5 + 0.5 * (item.value / max),
              }} />
            </div>
            <div style={{ width: 28, flexShrink: 0, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', textAlign: 'right' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

// ── Free insight card ──────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'var(--accent)',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
      }}>
        {insight.category}
      </div>

      <div style={{
        fontFamily: 'Clash Display, sans-serif',
        fontWeight: 500,
        fontSize: 16,
        color: 'var(--text-primary)',
        lineHeight: 1.4,
      }}>
        {insight.statement}
      </div>

      <div style={{
        backgroundColor: 'var(--surface-raised)',
        borderRadius: 'var(--radius-sm)',
        padding: '14px',
      }}>
        <MiniChart chart={insight.chart} />
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4 }}>
        {insight.detail}
      </div>
    </div>
  )
}

// ── Gated card (blurred with lock) ────────────────────────────────────────────

function GatedCard({ insight }: { insight: GatedInsight }) {
  return (
    <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* Blurred content */}
      <div style={{
        filter: 'blur(5px)',
        pointerEvents: 'none',
        userSelect: 'none',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--accent)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
        }}>
          {insight.category}
        </div>

        <div style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 500,
          fontSize: 16,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
        }}>
          {insight.previewStatement}
        </div>

        <div style={{
          backgroundColor: 'var(--surface-raised)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
        }}>
          <MiniChart chart={insight.chart} />
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          unlock to see the full analysis
        </div>
      </div>

      {/* Lock overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: 'rgba(13, 15, 17, 0.55)',
        borderRadius: 'var(--radius-lg)',
      }}>
        {/* Lock icon SVG */}
        <svg
          width={28}
          height={28}
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: 'var(--accent)' }}
        >
          <rect
            x={5} y={11} width={14} height={10}
            rx={2}
            style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 1.5 }}
          />
          <path
            d="M8 11V7a4 4 0 0 1 8 0v4"
            style={{ fill: 'none', stroke: 'var(--accent)', strokeWidth: 1.5, strokeLinecap: 'round' }}
          />
          <circle cx={12} cy={16} r={1.5} style={{ fill: 'var(--accent)' }} />
        </svg>

        <div style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--text-primary)',
        }}>
          {insight.category}
        </div>

        <button
          style={{
            padding: '7px 16px',
            backgroundColor: 'var(--accent)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 12,
            color: 'var(--bg)',
            cursor: 'pointer',
          }}
          onClick={() => alert('Donation support coming soon — check back soon.')}
        >
          unlock with a donation
        </button>
      </div>
    </div>
  )
}

// ── Skeleton loading state ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      {[10, 80, 55, 90, 40].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 2 ? 72 : 12,
            width: `${w}%`,
            backgroundColor: 'var(--surface-raised)',
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [allFilms, setAllFilms] = useState<Film[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllFilms().then(films => {
      setAllFilms(films)
      setLoading(false)
    })
  }, [])

  const freeInsights = useMemo(() => computeFreeInsights(allFilms), [allFilms])
  const gatedInsights = useMemo(() => computeGatedInsights(allFilms), [allFilms])

  const hasEnoughData = allFilms.length >= 10

  return (
    <div style={{ padding: '24px 24px 48px', maxWidth: 900 }}>
      <div style={{ marginBottom: 6 }}>
        <h1 style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--text-primary)',
        }}>
          Insights
        </h1>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 28 }}>
        patterns in your taste you probably never noticed
      </p>

      {/* Free tier */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: 11,
          color: 'var(--text-dim)',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
          marginBottom: 14,
        }}>
          surfaced from your data
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !hasEnoughData ? (
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            fontSize: 13,
            color: 'var(--text-dim)',
          }}>
            not enough data yet — import your Letterboxd export and enrich your films to unlock insights
          </div>
        ) : freeInsights.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            fontSize: 13,
            color: 'var(--text-dim)',
          }}>
            insights need more data — keep logging films and check back
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {freeInsights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>

      {/* Gated tier */}
      {!loading && (
        <div style={{ marginTop: 36 }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 11,
              color: 'var(--text-dim)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
            }}>
              deeper intelligence
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--accent)',
              backgroundColor: 'var(--accent-dim)',
              border: '1px solid var(--accent)',
              borderRadius: 4,
              padding: '1px 7px',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              unlock
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {gatedInsights.map(insight => (
              <GatedCard key={insight.id} insight={insight} />
            ))}
          </div>

          <div style={{
            marginTop: 20,
            padding: '14px 18px',
            backgroundColor: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)',
            fontSize: 13,
            color: 'var(--text-primary)',
            lineHeight: 1.5,
          }}>
            these insights are computed from your data and ready to read — a small donation keeps Cinestamp running and unlocks them all
          </div>
        </div>
      )}
    </div>
  )
}
