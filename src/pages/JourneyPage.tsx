import { useEffect, useMemo, useState } from 'react'
import { getAllFilms } from '../lib/stats'

// ─── date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateStr(d)
}

// ─── streak helpers ───────────────────────────────────────────────────────────

function computeLongestStreak(sortedDates: string[], stepDays: number): number {
  if (!sortedDates.length) return 0
  let max = 1
  let run = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = Math.round(
      (new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / 86400000
    )
    if (diff === stepDays) {
      run++
      if (run > max) max = run
    } else {
      run = 1
    }
  }
  return max
}

function computeCurrentStreak(dateSet: Set<string>, stepDays: number): number {
  if (!dateSet.size) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let d = new Date(now)
  // If today has no entry, try stepping back one unit
  if (!dateSet.has(toDateStr(d))) {
    d.setDate(d.getDate() - stepDays)
    if (!dateSet.has(toDateStr(d))) return 0
  }
  let count = 0
  while (dateSet.has(toDateStr(d))) {
    count++
    d.setDate(d.getDate() - stepDays)
  }
  return count
}

// ─── heatmap color scale ──────────────────────────────────────────────────────

function cellColor(count: number): string {
  if (count === 0) return 'var(--surface-raised)'
  if (count === 1) return 'rgba(245,166,35,0.35)'
  if (count === 2) return 'rgba(245,166,35,0.6)'
  return 'rgba(245,166,35,0.9)'
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StreakStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
      }}
    >
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 28,
          fontWeight: 500,
          color: value > 0 ? 'var(--accent)' : 'var(--text-dim)',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 20px 16px',
      }}
    >
      <h2
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 600,
          fontSize: 11,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 16,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function HBarRow({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
      <span
        style={{
          width: 36,
          flexShrink: 0,
          fontSize: 12,
          color: 'var(--text-secondary)',
          textAlign: 'right',
        }}
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
            width: max > 0 ? `${(count / max) * 100}%` : '0%',
            backgroundColor: 'var(--accent)',
            borderRadius: 3,
          }}
        />
      </div>
      <span
        style={{
          width: 36,
          flexShrink: 0,
          fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-dim)',
          textAlign: 'right',
        }}
      >
        {count}
      </span>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

interface JourneyData {
  dayMap: Map<string, number>
  logsPerYear: { year: number; count: number }[]
  cumulativeMonthly: { month: string; total: number }[]
  currentDayStreak: number
  longestDayStreak: number
  currentWeekStreak: number
  longestWeekStreak: number
  bingeSessions: { date: string; count: number }[]
  dayOfWeek: { day: string; count: number }[]
  byMonth: { month: string; count: number }[]
  firstEntry: string | null
  totalEntries: number
}

export default function JourneyPage() {
  const [data, setData] = useState<JourneyData | null>(null)

  useEffect(() => {
    getAllFilms().then(films => {
      const dates: string[] = []
      for (const film of films) {
        for (const entry of film.diaryEntries) {
          if (entry.watchedDate) dates.push(entry.watchedDate)
        }
      }

      // dayMap: date → count
      const dayMap = new Map<string, number>()
      for (const d of dates) dayMap.set(d, (dayMap.get(d) ?? 0) + 1)

      const sortedDays = [...dayMap.keys()].sort()

      // logs per year
      const yearMap = new Map<number, number>()
      for (const d of dates) {
        const y = new Date(d).getFullYear()
        yearMap.set(y, (yearMap.get(y) ?? 0) + 1)
      }
      const logsPerYear = [...yearMap.entries()]
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year)

      // cumulative monthly
      const monthMap = new Map<string, number>()
      for (const d of dates) {
        const key = d.slice(0, 7)
        monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
      }
      let running = 0
      const cumulativeMonthly = [...monthMap.keys()].sort().map(m => {
        running += monthMap.get(m) ?? 0
        return { month: m, total: running }
      })

      // streaks
      const daySet = new Set(dayMap.keys())
      const currentDayStreak = computeCurrentStreak(daySet, 1)
      const longestDayStreak = computeLongestStreak(sortedDays, 1)

      const weekMondays = [...new Set(sortedDays.map(getMondayOfWeek))].sort()
      const weekSet = new Set(weekMondays)
      const currentWeekStreak = computeCurrentStreak(weekSet, 7)
      const longestWeekStreak = computeLongestStreak(weekMondays, 7)

      // binge sessions
      const bingeSessions = [...dayMap.entries()]
        .filter(([, c]) => c >= 3)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // day of week (Mon-Sun order)
      const DOW_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const dowCounts = new Array(7).fill(0)
      for (const d of dates) {
        const day = new Date(d).getDay() // 0=Sun
        const idx = day === 0 ? 6 : day - 1
        dowCounts[idx]++
      }
      const dayOfWeek = DOW_NAMES.map((day, i) => ({ day, count: dowCounts[i] }))

      // by month
      const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const monthCounts = new Array(12).fill(0)
      for (const d of dates) monthCounts[new Date(d).getMonth()]++
      const byMonth = MONTH_NAMES.map((month, i) => ({ month, count: monthCounts[i] }))

      setData({
        dayMap,
        logsPerYear,
        cumulativeMonthly,
        currentDayStreak,
        longestDayStreak,
        currentWeekStreak,
        longestWeekStreak,
        bingeSessions,
        dayOfWeek,
        byMonth,
        firstEntry: sortedDays[0] ?? null,
        totalEntries: dates.length,
      })
    })
  }, [])

  // Heatmap: last 52 weeks, starting from Monday
  const heatmapCells = useMemo(() => {
    if (!data) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Start 52 weeks ago, on the Monday of that week
    const start = new Date(today)
    start.setDate(start.getDate() - 364)
    const dow = start.getDay()
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1))

    const cells: { date: string; count: number }[] = []
    const d = new Date(start)
    while (d <= today) {
      const key = toDateStr(d)
      cells.push({ date: key, count: data.dayMap.get(key) ?? 0 })
      d.setDate(d.getDate() + 1)
    }
    return cells
  }, [data])

  if (!data) {
    return (
      <div style={{ padding: '32px 24px' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
          loading...
        </span>
      </div>
    )
  }

  const maxYear = Math.max(...data.logsPerYear.map(d => d.count), 1)
  const maxDow   = Math.max(...data.dayOfWeek.map(d => d.count), 1)
  const maxMonth = Math.max(...data.byMonth.map(d => d.count), 1)

  // SVG cumulative chart
  const C = data.cumulativeMonthly
  const SVG_W = 800
  const SVG_H = 140
  const maxTotal = C.length ? C[C.length - 1].total : 1
  const svgPoints = C.map((p, i) => ({
    x: C.length > 1 ? (i / (C.length - 1)) * SVG_W : 0,
    y: SVG_H - (p.total / maxTotal) * SVG_H * 0.9,
  }))
  const linePath = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = svgPoints.length
    ? `${linePath} L${SVG_W},${SVG_H} L0,${SVG_H} Z`
    : ''

  return (
    <div style={{ padding: '24px 24px 40px', maxWidth: 900 }}>
      <h1
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        Journey
      </h1>
      {data.firstEntry && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>
          Logging since{' '}
          {new Date(data.firstEntry).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          {' · '}
          <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{data.totalEntries.toLocaleString()}</span>
          {' '}diary entries
        </p>
      )}

      {/* Contribution heatmap */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          marginBottom: 20,
          overflowX: 'auto',
        }}
      >
        <h2
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 11,
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 12,
          }}
        >
          Films logged — last 52 weeks
        </h2>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          {/* Day labels */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: 'repeat(7, 12px)',
              gap: 2,
              flexShrink: 0,
              paddingTop: 0,
            }}
          >
            {['Mon', '', 'Wed', '', 'Fri', '', ''].map((label, i) => (
              <div
                key={i}
                style={{
                  height: 12,
                  fontSize: 9,
                  color: 'var(--text-dim)',
                  lineHeight: '12px',
                  textAlign: 'right',
                  paddingRight: 4,
                }}
              >
                {label}
              </div>
            ))}
          </div>
          {/* Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateRows: 'repeat(7, 12px)',
              gridAutoFlow: 'column',
              gap: 2,
            }}
          >
            {heatmapCells.map((cell, i) => (
              <div
                key={i}
                title={`${cell.date}: ${cell.count} film${cell.count !== 1 ? 's' : ''}`}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: cellColor(cell.count),
                  cursor: cell.count > 0 ? 'default' : undefined,
                }}
              />
            ))}
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>less</span>
          {[0, 1, 2, 4].map(n => (
            <div
              key={n}
              style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: cellColor(n) }}
            />
          ))}
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>more</span>
        </div>
      </div>

      {/* Streaks */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
        className="md:grid-cols-4"
      >
        <StreakStat label="current day streak" value={data.currentDayStreak} />
        <StreakStat label="longest day streak" value={data.longestDayStreak} />
        <StreakStat label="current week streak" value={data.currentWeekStreak} />
        <StreakStat label="longest week streak" value={data.longestWeekStreak} />
      </div>

      {/* Films per year + cumulative */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}
        className="md:grid-cols-2 grid-cols-1"
      >
        <SectionCard title="Films logged per year">
          {data.logsPerYear.map(d => (
            <HBarRow key={d.year} label={String(d.year)} count={d.count} max={maxYear} />
          ))}
        </SectionCard>

        <SectionCard title="Cumulative films over time">
          {C.length > 1 ? (
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ width: '100%', display: 'block' }}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {areaPath && (
                <path d={areaPath} fill="url(#areaGrad)" />
              )}
              <path
                d={linePath}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Not enough data.</p>
          )}
          {C.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {C[0]?.month}
              </span>
              <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                {C[C.length - 1]?.total.toLocaleString()} total
              </span>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Day of week + month breakdown */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}
        className="md:grid-cols-2 grid-cols-1"
      >
        <SectionCard title="Day of week">
          {data.dayOfWeek.map(d => (
            <HBarRow key={d.day} label={d.day} count={d.count} max={maxDow} />
          ))}
        </SectionCard>

        <SectionCard title="Month of year">
          {data.byMonth.map(d => (
            <HBarRow key={d.month} label={d.month} count={d.count} max={maxMonth} />
          ))}
        </SectionCard>
      </div>

      {/* Binge sessions */}
      {data.bingeSessions.length > 0 && (
        <SectionCard title={`Binge sessions — days with 3+ films (${data.bingeSessions.length} total)`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.bingeSessions.map(s => (
              <div
                key={s.date}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'var(--surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {new Date(s.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 13,
                    color: 'var(--accent)',
                  }}
                >
                  {s.count} films
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
