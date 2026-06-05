import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { getAllFilms } from '../lib/stats'
import { languageName } from '../lib/stats'
import type { Film } from '../types'

// Simple vertical bar chart
function MiniVBar({ items, height = 90 }: { items: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...items.map(d => d.value), 0.01)
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, minWidth: items.length * 28 }}>
        {items.map(d => {
          const h = d.value > 0 ? Math.max(2, (d.value / max) * (height - 18)) : 0
          return (
            <div key={d.label} style={{ flex: '1 0 auto', minWidth: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 3 }}>
              <div style={{ width: '100%', height: h, backgroundColor: 'var(--accent)', borderRadius: '2px 2px 0 0', opacity: d.value > 0 ? 0.75 : 0.1 }} />
              <div style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', transform: items.length > 20 ? 'rotate(-40deg)' : 'none', transformOrigin: 'top center' }}>{d.label}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Section({ title, count, open, onToggle, children }: {
  title: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: 10, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--surface-raised)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        {open ? <ChevronDown size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} /> : <ChevronRight size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />}
        <span style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', flex: 1 }}>{title}</span>
        {count != null && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-dim)' }}>{count}</span>}
      </button>
      {open && <div style={{ padding: '4px 18px 18px' }}>{children}</div>}
    </div>
  )
}

export default function BreakdownPage() {
  const [allFilms, setAllFilms] = useState<Film[]>([])
  const [open, setOpen] = useState<Set<string>>(new Set(['year']))

  useEffect(() => { getAllFilms().then(setAllFilms) }, [])

  function toggle(id: string) {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const yearData = useMemo(() => {
    const map = new Map<number, number>()
    for (const f of allFilms)
      for (const e of f.diaryEntries)
        if (e.watchedDate) { const y = new Date(e.watchedDate).getFullYear(); map.set(y, (map.get(y) ?? 0) + 1) }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([label, value]) => ({ label: String(label), value }))
  }, [allFilms])

  const countryData = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of allFilms)
      for (const c of f.tmdbData?.productionCountries ?? [])
        if (c !== 'Antarctica') map.set(c, (map.get(c) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([label, value]) => ({ label, value }))
  }, [allFilms])

  const langData = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of allFilms)
      if (f.tmdbData?.originalLanguage) {
        const name = languageName(f.tmdbData.originalLanguage)
        map.set(name, (map.get(name) ?? 0) + 1)
      }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([label, value]) => ({ label, value }))
  }, [allFilms])

  const releaseYearData = useMemo(() => {
    const map = new Map<number, number>()
    for (const f of allFilms) if (f.year) map.set(f.year, (map.get(f.year) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([label, value]) => ({ label: String(label), value }))
  }, [allFilms])

  const genreData = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of allFilms) for (const g of f.tmdbData?.genres ?? []) map.set(g, (map.get(g) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [allFilms])

  const tagData = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of allFilms)
      for (const e of f.diaryEntries)
        for (const t of e.tags)
          if (t) map.set(t, (map.get(t) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [allFilms])

  return (
    <div style={{ padding: '24px 24px 40px', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Clash Display, sans-serif', fontWeight: 600, fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>Breakdown</h1>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 24 }}>Your watch data sliced every way — click a section to expand.</p>

      <Section title="Watch history by year" count={yearData.length} open={open.has('year')} onToggle={() => toggle('year')}>
        <MiniVBar items={yearData} height={120} />
      </Section>

      <Section title="By genre" count={genreData.length} open={open.has('genre')} onToggle={() => toggle('genre')}>
        <MiniVBar items={genreData} height={110} />
      </Section>

      <Section title="By language" count={langData.length} open={open.has('lang')} onToggle={() => toggle('lang')}>
        <MiniVBar items={langData} height={110} />
      </Section>

      <Section title="By production country" count={countryData.length} open={open.has('country')} onToggle={() => toggle('country')}>
        <MiniVBar items={countryData} height={110} />
      </Section>

      <Section title="By release year" count={releaseYearData.length} open={open.has('release')} onToggle={() => toggle('release')}>
        <MiniVBar items={releaseYearData} height={110} />
      </Section>

      <Section title="By tag" count={tagData.length} open={open.has('tags')} onToggle={() => toggle('tags')}>
        {tagData.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No tags found — add tags to diary entries on Letterboxd.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {tagData.map(t => (
              <div key={t.label} style={{ padding: '5px 10px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, alignItems: 'center' }}>
                {t.label}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--accent)' }}>{t.value}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
