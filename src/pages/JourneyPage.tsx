import { useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark, Maximize2, X } from 'lucide-react'
import { getAllFilms } from '../lib/stats'
import type { Film } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiaryEntry { date: string; film: Film; rating?: number }

interface StreakDetail {
  current: number; currentSince?: string
  longest: number; longestStart?: string; longestEnd?: string
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date): string { return d.toISOString().slice(0, 10) }

function getMondayDate(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  const dow = copy.getDay()
  copy.setDate(copy.getDate() - (dow === 0 ? 6 : dow - 1))
  return copy
}

function fmtDateShort(s: string): string {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
function fmtHoverDate(s: string): string {
  return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ─── Streak helpers ───────────────────────────────────────────────────────────

function computeDayStreak(sortedDays: string[]): StreakDetail {
  if (!sortedDays.length) return { current: 0, longest: 0 }
  const daySet = new Set(sortedDays)
  const today = new Date(); today.setHours(0, 0, 0, 0)

  // Current
  let cur = new Date(today)
  if (!daySet.has(toDateStr(cur))) cur.setDate(cur.getDate() - 1)
  let currentCount = 0; let currentSince: string | undefined
  const tmp = new Date(cur)
  while (daySet.has(toDateStr(tmp))) { currentSince = toDateStr(tmp); currentCount++; tmp.setDate(tmp.getDate() - 1) }

  // Longest
  let maxRun = 1; let curRun = 1
  let maxStart = sortedDays[0]; let maxEnd = sortedDays[0]; let runStart = sortedDays[0]
  for (let i = 1; i < sortedDays.length; i++) {
    const diff = Math.round((new Date(sortedDays[i]).getTime() - new Date(sortedDays[i - 1]).getTime()) / 86400000)
    if (diff === 1) { curRun++; if (curRun > maxRun) { maxRun = curRun; maxStart = runStart; maxEnd = sortedDays[i] } }
    else { curRun = 1; runStart = sortedDays[i] }
  }

  return { current: currentCount, currentSince, longest: maxRun, longestStart: maxStart, longestEnd: maxEnd }
}

function computeWeekStreak(weekMondays: string[]): StreakDetail {
  if (!weekMondays.length) return { current: 0, longest: 0 }
  const weekSet = new Set(weekMondays)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const thisMonday = toDateStr(getMondayDate(today))

  // Current — start from this week's Monday (in-progress week counts)
  let startKey = weekSet.has(thisMonday) ? thisMonday : (() => {
    const lm = new Date(getMondayDate(today)); lm.setDate(lm.getDate() - 7)
    return weekSet.has(toDateStr(lm)) ? toDateStr(lm) : ''
  })()

  let currentCount = 0; let currentSince: string | undefined
  if (startKey) {
    const cur = new Date(startKey)
    while (weekSet.has(toDateStr(cur))) { currentSince = toDateStr(cur); currentCount++; cur.setDate(cur.getDate() - 7) }
  }

  // Longest
  const sorted = weekMondays
  let maxRun = 1; let curRun = 1
  let maxStart = sorted[0]; let maxEnd = sorted[0]; let runStart = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000)
    if (diff === 7) { curRun++; if (curRun > maxRun) { maxRun = curRun; maxStart = runStart; maxEnd = sorted[i] } }
    else { curRun = 1; runStart = sorted[i] }
  }

  return { current: currentCount, currentSince, longest: maxRun, longestStart: maxStart, longestEnd: maxEnd }
}

// ─── Heatmap helpers ──────────────────────────────────────────────────────────

interface HeatCell { date: string; count: number; inYear: boolean; isFuture: boolean }

function buildYearCells(year: number, dayMap: Map<string, number>): HeatCell[] {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const jan1 = new Date(year, 0, 1)
  const start = getMondayDate(jan1)
  const dec31 = new Date(year, 11, 31)
  const endDow = dec31.getDay()
  const end = new Date(dec31); end.setDate(dec31.getDate() + (endDow === 0 ? 0 : 7 - endDow))
  const cells: HeatCell[] = []
  const cur = new Date(start)
  while (cur <= end) {
    const ds = toDateStr(cur)
    cells.push({ date: ds, count: dayMap.get(ds) ?? 0, inYear: cur.getFullYear() === year, isFuture: cur > today })
    cur.setDate(cur.getDate() + 1)
  }
  return cells
}

function cellStyle(cell: HeatCell, maxCount: number): React.CSSProperties {
  if (!cell.inYear) return { backgroundColor: 'var(--surface-raised)', opacity: 0.25 }
  if (cell.isFuture) return { backgroundColor: 'var(--surface-raised)', opacity: 0.35 }
  if (cell.count === 0) return { backgroundColor: 'var(--surface-raised)' }
  return { backgroundColor: 'var(--accent)', opacity: 0.15 + (cell.count / maxCount) * 0.85 }
}

// ─── ISO week helpers ─────────────────────────────────────────────────────────

function getISOWeekKey(d: Date): string {
  const thu = new Date(d); thu.setDate(d.getDate() + (4 - (d.getDay() || 7)))
  const yr = thu.getFullYear()
  const wk = Math.ceil((((thu.getTime() - new Date(yr, 0, 1).getTime()) / 86400000) + 1) / 7)
  return `${yr}-W${String(wk).padStart(2, '0')}`
}

function weekKeyToMonday(key: string): Date {
  const [yr, wk] = key.split('-W').map(Number)
  const jan4 = new Date(yr, 0, 4)
  const w1Mon = getMondayDate(jan4)
  const mon = new Date(w1Mon); mon.setDate(w1Mon.getDate() + (wk - 1) * 7)
  return mon
}

// ─── Milestone helpers ────────────────────────────────────────────────────────

function getMilestoneNums(total: number): number[] {
  if (total < 500)  return [100, 200, 300, 400].filter(n => n < total)
  if (total < 2000) return [500, 1000, 1500].filter(n => n < total)
  return [1000, 2000, 3000].filter(n => n < total)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function ModeBtn({ cur, set }: { cur: 'count' | 'rating'; set: (m: 'count' | 'rating') => void }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {(['count', 'rating'] as const).map(m => (
        <button key={m} onClick={() => set(m)} style={{
          padding: '3px 8px', fontSize: 11, fontWeight: 500,
          color: cur === m ? 'var(--accent)' : 'var(--text-dim)',
          backgroundColor: cur === m ? 'var(--accent-dim)' : 'transparent',
          border: `1px solid ${cur === m ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        }}>
          {m === 'count' ? 'Count' : 'Rating'}
        </button>
      ))}
    </div>
  )
}

function VBarChart({ items, height = 100, scrollable = false }: {
  items: { label: string; value: number }[]
  height?: number
  scrollable?: boolean
}) {
  const max = Math.max(...items.map(d => d.value), 0.01)
  const barMinW = scrollable ? Math.max(12, Math.min(30, 560 / items.length)) : undefined
  return (
    <div style={{ overflowX: scrollable ? 'auto' : 'visible', paddingBottom: scrollable ? 2 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, minWidth: scrollable ? items.length * ((barMinW ?? 12) + 4) : undefined }}>
        {items.map(d => {
          const h = d.value > 0 ? Math.max(2, (d.value / max) * (height - 18)) : 0
          return (
            <div key={d.label} style={{ flex: '1 0 auto', width: barMinW, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 3 }}>
              <div style={{ width: '100%', height: h, backgroundColor: 'var(--accent)', borderRadius: '2px 2px 0 0', opacity: d.value > 0 ? 0.8 : 0.12 }} />
              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>{d.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StreakCard({ label, detail, isLongest }: { label: string; detail: StreakDetail; isLongest: boolean }) {
  const value = isLongest ? detail.longest : detail.current
  const since = isLongest
    ? (detail.longestStart && detail.longestEnd ? `${fmtDateShort(detail.longestStart)} → ${fmtDateShort(detail.longestEnd)}` : undefined)
    : (detail.currentSince ? `since ${fmtDateShort(detail.currentSince)}` : undefined)
  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px' }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 500, color: value > 0 ? 'var(--accent)' : 'var(--text-dim)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{label}</div>
      {since && value > 0 && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, opacity: 0.7 }}>{since}</div>}
    </div>
  )
}

// ─── Heatmap component ────────────────────────────────────────────────────────

const DOW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

function Heatmap({ cells, maxCount, onCellHover, onCellClick }: {
  cells: HeatCell[]
  maxCount: number
  onCellHover: (cell: HeatCell | null, x: number, y: number) => void
  onCellClick: (cell: HeatCell) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 11px)', gap: 2, flexShrink: 0 }}>
        {DOW_LABELS.map((l, i) => (
          <div key={i} style={{ height: 11, fontSize: 9, color: 'var(--text-dim)', lineHeight: '11px', textAlign: 'right', paddingRight: 3 }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 11px)', gridAutoFlow: 'column', gap: 2 }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            style={{
              width: 11, height: 11, borderRadius: 2, cursor: cell.count > 0 ? 'pointer' : 'default',
              ...cellStyle(cell, maxCount),
            }}
            onMouseEnter={e => onCellHover(cell, e.clientX, e.clientY)}
            onMouseLeave={() => onCellHover(null, 0, 0)}
            onClick={() => cell.count > 0 && onCellClick(cell)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Film reel roadmap ────────────────────────────────────────────────────────

function FilmReelRoadmap({ allEntries, watchlistCount }: { allEntries: DiaryEntry[]; watchlistCount: number }) {
  if (allEntries.length === 0) return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
      <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Log some films to see your reel.</p>
    </div>
  )

  const nums = getMilestoneNums(allEntries.length)
  interface Marker { type: 'first' | 'milestone' | 'last'; entry: DiaryEntry; num?: number }
  const markers: Marker[] = [
    { type: 'first', entry: allEntries[0] },
    ...nums.map(n => ({ type: 'milestone' as const, entry: allEntries[n - 1], num: n })),
    ...(allEntries.length > 1 ? [{ type: 'last' as const, entry: allEntries[allEntries.length - 1] }] : []),
  ]

  const STRIP_W = 18
  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Film Reel</h2>
      </div>
      <div style={{ maxHeight: 520, overflowY: 'auto' }}>
        <div style={{ position: 'relative', paddingLeft: STRIP_W + 12, paddingRight: STRIP_W + 12, paddingTop: 12, paddingBottom: 12 }}>
          {/* Left film strip */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: STRIP_W, backgroundColor: 'var(--surface-raised)', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center', padding: '8px 0' }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 5, backgroundColor: 'var(--bg)', borderRadius: 1 }} />
            ))}
          </div>
          {/* Right film strip */}
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: STRIP_W, backgroundColor: 'var(--surface-raised)', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', alignItems: 'center', padding: '8px 0' }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} style={{ width: 8, height: 5, backgroundColor: 'var(--bg)', borderRadius: 1 }} />
            ))}
          </div>
          {/* Connector line */}
          <div style={{ position: 'absolute', left: STRIP_W + 22, top: 0, bottom: 0, borderLeft: '1px dashed var(--border)' }} />
          {/* Entries */}
          {markers.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 20, position: 'relative' }}>
              {/* Dot */}
              <div style={{ position: 'absolute', left: 6, top: 16, width: 7, height: 7, borderRadius: '50%', backgroundColor: m.type === 'first' || m.type === 'last' ? 'var(--accent)' : 'var(--accent-low)', border: '2px solid var(--surface)', flexShrink: 0 }} />
              {/* Poster */}
              {m.entry.film.tmdbData?.posterPath ? (
                <img src={`https://image.tmdb.org/t/p/w92${m.entry.film.tmdbData.posterPath}`} alt="" style={{ width: 32, height: 48, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 48, backgroundColor: 'var(--surface-raised)', borderRadius: 3, flexShrink: 0 }} />
              )}
              {/* Text */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, marginBottom: 1 }}>
                  {m.type === 'first' && <span style={{ color: 'var(--text-dim)' }}>first log</span>}
                  {m.type === 'last' && <span style={{ color: 'var(--text-dim)' }}>latest log</span>}
                  {m.type === 'milestone' && <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', fontWeight: 500 }}>#{m.num?.toLocaleString()}</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {m.entry.film.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{fmtDateShort(m.entry.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Bookmark size={12} style={{ color: 'var(--text-dim)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{watchlistCount.toLocaleString()} films in watchlist</span>
      </div>
    </div>
  )
}

// ─── Cumulative chart ─────────────────────────────────────────────────────────

function CumulativeChart({ data }: { data: { month: string; total: number }[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<{ idx: number; x: number } | null>(null)

  if (data.length < 2) return <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Not enough data.</p>

  const W = 800; const H = 120
  const maxTotal = data[data.length - 1].total
  const pts = data.map((p, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - (p.total / maxTotal) * H * 0.92,
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const idx = Math.round(frac * (data.length - 1))
    setHover({ idx, x: frac * rect.width })
  }

  const hoverPoint = hover != null ? data[hover.idx] : null
  const hoverSvgX = hover != null ? (hover.idx / (data.length - 1)) * W : 0

  return (
    <div style={{ position: 'relative' }}>
      {hoverPoint && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: `${(hover!.idx / (data.length - 1)) * 100}%`,
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
          fontSize: 11,
          color: 'var(--text-primary)',
          fontFamily: 'JetBrains Mono, monospace',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 10,
        }}>
          {hoverPoint.month} · {hoverPoint.total.toLocaleString()}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block', aspectRatio: '5/1', cursor: 'crosshair' }}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {hover != null && (
          <>
            <line x1={hoverSvgX} y1={0} x2={hoverSvgX} y2={H} stroke="var(--accent)" strokeWidth="1" strokeDasharray="3,3" strokeOpacity="0.6" />
            <circle cx={hoverSvgX} cy={pts[hover.idx].y} r="4" fill="var(--accent)" />
          </>
        )}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{data[0].month}</span>
        <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>{data[data.length - 1].total.toLocaleString()} total</span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function JourneyPage() {
  const [allEntries, setAllEntries] = useState<DiaryEntry[]>([])
  const [dayMap, setDayMap] = useState<Map<string, DiaryEntry[]>>(new Map())
  const [dayStreak, setDayStreak] = useState<StreakDetail>({ current: 0, longest: 0 })
  const [weekStreak, setWeekStreak] = useState<StreakDetail>({ current: 0, longest: 0 })
  const [watchlistCount, setWatchlistCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [yearMode, setYearMode] = useState<'count' | 'rating'>('count')
  const [hoverCell, setHoverCell] = useState<{ cell: HeatCell; x: number; y: number } | null>(null)
  const [dayModal, setDayModal] = useState<{ date: string; entries: DiaryEntry[] } | null>(null)
  const [expandModal, setExpandModal] = useState(false)

  useEffect(() => {
    getAllFilms().then(films => {
      const entries: DiaryEntry[] = []
      for (const film of films) {
        for (const e of film.diaryEntries) {
          if (e.watchedDate) entries.push({ date: e.watchedDate, film, rating: e.rating ?? film.rating })
        }
      }
      entries.sort((a, b) => a.date.localeCompare(b.date))

      const dm = new Map<string, DiaryEntry[]>()
      for (const e of entries) {
        const arr = dm.get(e.date) ?? []; arr.push(e); dm.set(e.date, arr)
      }

      const sortedDays = [...dm.keys()].sort()
      const weekMondays = [...new Set(sortedDays.map(d => toDateStr(getMondayDate(new Date(d)))))]
        .sort()

      setAllEntries(entries)
      setDayMap(dm)
      setDayStreak(computeDayStreak(sortedDays))
      setWeekStreak(computeWeekStreak(weekMondays))
      setWatchlistCount(films.filter(f => f.onWatchlist).length)
      setLoading(false)
    })
  }, [])

  // ── Derived data ─────────────────────────────────────────────────────────────

  const years = useMemo(() => {
    const dataYears = new Set(allEntries.map(e => new Date(e.date).getFullYear()))
    dataYears.add(new Date().getFullYear())
    return [...dataYears].sort()
  }, [allEntries])

  const heatCells = useMemo(() => buildYearCells(selectedYear, new Map([...dayMap.entries()].map(([k, v]) => [k, v.length]))), [selectedYear, dayMap])
  const heatMax = useMemo(() => Math.max(...heatCells.filter(c => c.inYear && !c.isFuture).map(c => c.count), 1), [heatCells])

  const logsPerYear = useMemo(() => {
    const map = new Map<number, { count: number; ratings: number[] }>()
    for (const e of allEntries) {
      const y = new Date(e.date).getFullYear()
      const d = map.get(y) ?? { count: 0, ratings: [] }
      d.count++
      if (e.rating != null) d.ratings.push(e.rating)
      map.set(y, d)
    }
    return [...map.entries()].map(([year, d]) => ({
      label: String(year),
      count: d.count,
      avgRating: d.ratings.length >= 3 ? d.ratings.reduce((s, r) => s + r, 0) / d.ratings.length : undefined,
    })).sort((a, b) => Number(a.label) - Number(b.label))
  }, [allEntries])

  const cumulativeMonthly = useMemo(() => {
    const monthMap = new Map<string, number>()
    for (const e of allEntries) {
      const k = e.date.slice(0, 7)
      monthMap.set(k, (monthMap.get(k) ?? 0) + 1)
    }
    let running = 0
    return [...monthMap.keys()].sort().map(m => { running += monthMap.get(m) ?? 0; return { month: m, total: running } })
  }, [allEntries])

  const DOW_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const dayOfWeek = useMemo(() => {
    const counts = new Array(7).fill(0)
    for (const e of allEntries) {
      const dow = new Date(e.date).getDay()
      counts[dow === 0 ? 6 : dow - 1]++
    }
    return DOW_NAMES.map((day, i) => ({ label: day, value: counts[i] }))
  }, [allEntries])

  const byMonth = useMemo(() => {
    const counts = new Array(12).fill(0)
    for (const e of allEntries) counts[new Date(e.date).getMonth()]++
    return MONTH_NAMES.map((m, i) => ({ label: m, value: counts[i] }))
  }, [allEntries])

  const bingeSessions = useMemo(() =>
    [...dayMap.entries()]
      .filter(([, arr]) => arr.length >= 3)
      .map(([date, arr]) => ({ date, count: arr.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  , [dayMap])

  const topWeeks = useMemo(() => {
    const wm = new Map<string, number>()
    for (const e of allEntries) wm.set(getISOWeekKey(new Date(e.date)), (wm.get(getISOWeekKey(new Date(e.date))) ?? 0) + 1)
    return [...wm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, count]) => {
      const mon = weekKeyToMonday(key)
      return { label: `Week of ${mon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, count }
    })
  }, [allEntries])

  const yearBarItems = useMemo(() =>
    logsPerYear.map(d => ({ label: d.label, value: yearMode === 'count' ? d.count : (d.avgRating ?? 0) }))
  , [logsPerYear, yearMode])

  if (loading) {
    return <div style={{ padding: '32px 24px' }}><span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>loading...</span></div>
  }

  const firstEntry = allEntries[0]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 24px 40px' }}>
      <h1 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>Journey</h1>
      {firstEntry && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>
          Logging since {new Date(firstEntry.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          {' · '}<span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{allEntries.length.toLocaleString()}</span> diary entries
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>
        {/* ── Left main column ── */}
        <div>
          {/* Heatmap */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 20, overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Films logged — {selectedYear}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Year selector */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {years.map(y => (
                    <button key={y} onClick={() => setSelectedYear(y)} style={{
                      padding: '2px 7px', fontSize: 11, fontWeight: selectedYear === y ? 600 : 400,
                      color: selectedYear === y ? 'var(--accent)' : 'var(--text-dim)',
                      backgroundColor: selectedYear === y ? 'var(--accent-dim)' : 'transparent',
                      border: `1px solid ${selectedYear === y ? 'var(--accent)' : 'transparent'}`,
                      borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    }}>{y}</button>
                  ))}
                </div>
                <button onClick={() => setExpandModal(true)} title="Expand all years" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2, display: 'flex', alignItems: 'center' }}>
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>
            <Heatmap
              cells={heatCells}
              maxCount={heatMax}
              onCellHover={(cell, x, y) => setHoverCell(cell ? { cell, x, y } : null)}
              onCellClick={cell => { const entries = dayMap.get(cell.date) ?? []; if (entries.length) setDayModal({ date: cell.date, entries }) }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>less</span>
              {[0, 0.25, 0.5, 0.75, 1].map(t => (
                <div key={t} style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: t === 0 ? 'var(--surface-raised)' : 'var(--accent)', opacity: t === 0 ? 1 : 0.15 + t * 0.85 }} />
              ))}
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>more</span>
            </div>
          </div>

          {/* Streaks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            <StreakCard label="current day streak" detail={dayStreak} isLongest={false} />
            <StreakCard label="longest day streak" detail={dayStreak} isLongest={true} />
            <StreakCard label="current week streak" detail={weekStreak} isLongest={false} />
            <StreakCard label="longest week streak" detail={weekStreak} isLongest={true} />
          </div>

          {/* Films per year + Cumulative */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <SectionCard title="Films logged per year" action={<ModeBtn cur={yearMode} set={setYearMode} />}>
              <VBarChart items={yearBarItems} height={110} scrollable={logsPerYear.length > 15} />
            </SectionCard>
            <SectionCard title="Cumulative films over time">
              <CumulativeChart data={cumulativeMonthly} />
            </SectionCard>
          </div>

          {/* Day of week + Month */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <SectionCard title="Day of week">
              <VBarChart items={dayOfWeek} height={100} />
            </SectionCard>
            <SectionCard title="Month of year">
              <VBarChart items={byMonth} height={100} />
            </SectionCard>
          </div>

          {/* Binge sessions */}
          {(bingeSessions.length > 0 || topWeeks.length > 0) && (
            <SectionCard title={`Binge sessions · days with 3+ films`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: topWeeks.length ? 20 : 0 }}>
                {bingeSessions.map(s => (
                  <div key={s.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {new Date(s.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--accent)' }}>{s.count} films</span>
                  </div>
                ))}
              </div>
              {topWeeks.length > 0 && (
                <>
                  <h3 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Most active weeks</h3>
                  {topWeeks.map((w, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{w.label}</span>
                      <div style={{ width: 80, height: 4, backgroundColor: 'var(--surface-raised)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(w.count / (topWeeks[0]?.count ?? 1)) * 100}%`, backgroundColor: 'var(--accent)', borderRadius: 2 }} />
                      </div>
                      <span style={{ width: 36, textAlign: 'right', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', flexShrink: 0 }}>{w.count}</span>
                    </div>
                  ))}
                </>
              )}
            </SectionCard>
          )}
        </div>

        {/* ── Right column: Film reel ── */}
        <div style={{ position: 'sticky', top: 16 }}>
          <FilmReelRoadmap allEntries={allEntries} watchlistCount={watchlistCount} />
        </div>
      </div>

      {/* ── Hover tooltip ── */}
      {hoverCell && (
        <div style={{
          position: 'fixed', top: hoverCell.y - 36, left: hoverCell.x + 10,
          backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '5px 9px',
          fontSize: 12, color: 'var(--text-primary)',
          pointerEvents: 'none', zIndex: 1000, whiteSpace: 'nowrap',
        }}>
          {fmtHoverDate(hoverCell.cell.date)} · {hoverCell.cell.count} film{hoverCell.cell.count !== 1 ? 's' : ''} logged
        </div>
      )}

      {/* ── Day click modal ── */}
      {dayModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--overlay-heavy)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setDayModal(null)}
        >
          <div
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, maxWidth: 440, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(dayModal.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => setDayModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2 }}>
                <X size={16} />
              </button>
            </div>
            {dayModal.entries.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {e.film.tmdbData?.posterPath ? (
                  <img src={`https://image.tmdb.org/t/p/w92${e.film.tmdbData.posterPath}`} alt="" style={{ width: 40, height: 60, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 40, height: 60, backgroundColor: 'var(--surface-raised)', borderRadius: 4, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.film.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{e.film.year}</div>
                  {e.rating != null && <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)', marginTop: 4 }}>{e.rating.toFixed(1)}★</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Expand all years modal ── */}
      {expandModal && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--overlay-heavy)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: 24 }}
          onClick={() => setExpandModal(false)}
        >
          <div
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 900 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'Clash Display, sans-serif', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>All years</h2>
              <button onClick={() => setExpandModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2 }}>
                <X size={18} />
              </button>
            </div>
            {[...years].reverse().map(yr => {
              const yrCells = buildYearCells(yr, new Map([...dayMap.entries()].map(([k, v]) => [k, v.length])))
              const yrMax = Math.max(...yrCells.filter(c => c.inYear && !c.isFuture).map(c => c.count), 1)
              return (
                <div key={yr} style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace' }}>{yr}</div>
                  <div style={{ overflowX: 'auto' }}>
                    <Heatmap cells={yrCells} maxCount={yrMax} onCellHover={(cell, x, y) => setHoverCell(cell ? { cell, x, y } : null)} onCellClick={() => {}} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
