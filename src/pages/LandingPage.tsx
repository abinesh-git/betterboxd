import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useScroll, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import Logo from '../components/ui/Logo'

// ─── Constants ────────────────────────────────────────────────────────────────

const POSTER_PATHS = [
  '/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg',
  '/gEjLtJooPBKFQBFzgNQiPHbFQWk.jpg',
  '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
  '/3bhkrj58Vtu7enYsLegjoezone4I.jpg',
  '/ve72VxNqajIgy0oi2NGpFDFBTCe.jpg',
  '/bMNEUMFB7u4nFBq5VDyMCkwHWKQ.jpg',
  '/2aBSCHJRLMbJbzUbSZNmcgGmJEm.jpg',
  '/nGQJBBwNMHLhA7dPfgJJrJqLhwQ.jpg',
  '/9UPzgEq6NJbhXquXnRkVqBWIooV.jpg',
  '/fKQAlTCEQaXcS96YRFlfG8VdCJW.jpg',
  '/k7eYdWvhYQyRQoU2TB2A2Xu2grZ.jpg',
  '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
  '/AkJQpZp9WoNdj7pLYSj1L0RcMMN.jpg',
  '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg',
  '/swdQ7q6GjwAn6bFUoJ3h40Mxk6I.jpg',
  '/4911QoMBDsGgHJoNT1E1Y9FPFnX.jpg',
  '/lRETAzb5qm7GqDzxEzFJSMgBOEA.jpg',
  '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
  '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
  '/loRmRzQAdBYjFBrDp7Po8vNBJeQ.jpg',
  '/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg',
  '/6WxhEvFsauuACfv8HyoVX6mZKFj.jpg',
  '/ugS5FVgAz2aRPQmcYlNqMFkJz0u.jpg',
  '/6BqCMWTDqJOdFGTSbUfbSzRKcvQ.jpg',
  '/sGlDe9PXa9HnA6Fs9DYVKM8Pf3.jpg',
  '/2u7zbn8EudG6kLlBzUYqP8RyFpM.jpg',
  '/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
  '/tbVAwiMCEyM2W5CknJMHLFWeSV9.jpg',
  '/qk5BHpCJcN7SXQY0l6GUCIZN8uQ.jpg',
  '/mTkHIFZUyd6Q0HxAT6ggJKEcGtJ.jpg',
  '/8N4HXOQOT1wC3ATXEeGHKPdQEMM.jpg',
  '/7tQvDrzTfhlZTHT9GmRWs1TZrGb.jpg',
  '/fcVHsRMuNJpXxNIkHMRxaGlLUjZ.jpg',
  '/xGExCer4xdHmAd7TJkpGXADRuOE.jpg',
  '/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg',
  '/pB8BM7pdSp6B6Ii9HaRyLQeDkAL.jpg',
  '/iQFcwSGbZXMkeyKFxyd73O09O1e.jpg',
  '/t6HIqrRAclMCA60NjgJcFhTkVUI.jpg',
  '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
  '/7Bu9RmCnBkf1dVRMaBMoL3HNxBB.jpg',
  '/km0I5YBaFaFKAMCVfPbWJcYVBCS.jpg',
  '/e1mjopzAS2KNsvpbpahQ1a7eDEs.jpg',
  '/pjnD08FlMAIXTCLLkex1HGQ3Ne5.jpg',
  '/3dQxFMbqBhEiIlEKNQQRHWAiRhA.jpg',
  '/bWkfkUqTGRzqEzQFbVkIHOSbIqz.jpg',
  '/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg',
  '/AdZZjuDPbwXHMkBFBUbDLSHJKMw.jpg',
  '/f89U3ADr1oiB1s9GkdPOKpXub7P.jpg',
  '/iMzsGCBCgCQHmGRBqaE5yzBkXvC.jpg',
  '/3GrBQMWZjVGRPQYkKDdQarQQdWI.jpg',
  '/hU42CRx8p0SQkHlRxW3bgSORhGN.jpg',
  '/8cdWjvZQUExUULrvFT2Ls7FGBDs.jpg',
  '/iZf0KyrE25z1sage4SYFLCCrMi9.jpg',
  '/bOGkgRGo36z8XzNqKPh2FqLXp4D.jpg',
  '/9PqD3wSiJQUNbHOXNVQijHjGjIF.jpg',
  '/5c0ooqkHBdPQTdqGKL2AKZEK5b0.jpg',
  '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  '/kXfKWfaQiEKJJg4aDkNiPQbVWiM.jpg',
  '/kve20tXygMLETKBmEEFKuGFmgPS.jpg',
  '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
  '/A4WovbXMd6EXTRFEaL3dM7rNhOQ.jpg',
  '/pWHf4khOloNVFrbXpeh5sHYZMsm.jpg',
  '/bGApbIqHpQDrBBnmNxrXwNJrLvv.jpg',
  '/oYuLELs3M8HCrJnvOXLn0MXbwjP.jpg',
  '/9gk7adUG3mqggqyXvkIOXuOrHuU.jpg',
  '/vzmL6fTBqGMWFmkCQxhTZdaYXHO.jpg',
  '/fm6KqXpk3M27VCCsEKJiPOBsEze.jpg',
  '/AkJQpZp9WoNdj7pLYSj1L0RcMMN.jpg',
  '/swdQ7q6GjwAn6bFUoJ3h40Mxk6I.jpg',
  '/lRETAzb5qm7GqDzxEzFJSMgBOEA.jpg',
  '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
  '/6WxhEvFsauuACfv8HyoVX6mZKFj.jpg',
  '/fcVHsRMuNJpXxNIkHMRxaGlLUjZ.jpg',
  '/iMzsGCBCgCQHmGRBqaE5yzBkXvC.jpg',
  '/3GrBQMWZjVGRPQYkKDdQarQQdWI.jpg',
  '/hU42CRx8p0SQkHlRxW3bgSORhGN.jpg',
  '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
  '/km0I5YBaFaFKAMCVfPbWJcYVBCS.jpg',
  '/pjnD08FlMAIXTCLLkex1HGQ3Ne5.jpg',
  '/kve20tXygMLETKBmEEFKuGFmgPS.jpg',
]

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'Do I need a Letterboxd account?',
    a: "Yes — you'll need one to export your data. But once you have the export file, Cinestamp works entirely in your browser. No Letterboxd login required here.",
  },
  {
    q: 'Is my data stored on your servers?',
    a: "Not right now. Everything lives in your browser — your watch history never leaves your device. When accounts launch, you'll choose whether to sync to the cloud.",
  },
  {
    q: 'How often do I need to re-upload?',
    a: "Whenever you want fresh stats. Exporting takes 30 seconds on Letterboxd. Re-uploading is smart — Cinestamp only processes new films, not your entire history again.",
  },
  {
    q: 'Is Cinestamp free?',
    a: "Yes. The full dashboard is free. A few intelligence features are behind a small optional donation — entirely your choice.",
  },
  {
    q: 'Will this work with years of history?',
    a: "Yes. Cinestamp handles large exports well. First-time enrichment takes a few minutes for big libraries. After that, every visit is instant.",
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface PosterInstance {
  path: string
  el: HTMLImageElement
  x: number
  y: number
  vy: number
  rotation: number
  phaseOffset: number
  state: 'falling' | 'landed' | 'fading'
  fadeStartTime: number
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── SVG Slide Visuals ────────────────────────────────────────────────────────

function GenreBarChart() {
  const [on, setOn] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setOn(true)) }, [])

  const genres = [
    { name: 'Drama', pct: 32 },
    { name: 'Thriller', pct: 24 },
    { name: 'Comedy', pct: 18 },
    { name: 'Horror', pct: 12 },
    { name: 'Romance', pct: 8 },
    { name: 'Documentary', pct: 6 },
    { name: 'Animation', pct: 4 },
    { name: 'Sci-Fi', pct: 2 },
  ]
  const maxW = 180

  return (
    <svg viewBox="0 0 320 240" width="100%">
      {genres.map((g, i) => {
        const y = 12 + i * 28
        const barW = (g.pct / 32) * maxW
        return (
          <g key={g.name}>
            <text
              x={0} y={y + 11}
              style={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
            >
              {g.name}
            </text>
            {/* track */}
            <rect x={108} y={y} width={maxW} height={16} rx={3}
              style={{ fill: 'var(--surface-raised)' }} />
            {/* fill */}
            <rect
              x={108} y={y}
              width={barW} height={16} rx={3}
              style={{
                fill: 'var(--accent)',
                opacity: 0.82,
                transformBox: 'fill-box',
                transformOrigin: 'left center',
                transform: on ? 'scaleX(1)' : 'scaleX(0)',
                transition: `transform 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 0.09}s`,
              }}
            />
            <text
              x={296} y={y + 11}
              textAnchor="end"
              style={{
                fill: 'var(--accent)',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
                opacity: on ? 1 : 0,
                transition: `opacity 0.3s ease ${i * 0.09 + 0.4}s`,
              }}
            >
              {g.pct}%
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function TasteLineChart() {
  const [on, setOn] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setOn(true)) }, [])

  // viewBox 320×200, chart area x:40–300, y:20–170
  const drama = 'M 40,76 C 66,76 66,50 92,50 C 118,50 118,65 144,65 C 170,65 170,39 196,39 C 222,39 222,59 248,59 C 274,59 274,50 300,50'
  const thriller = 'M 40,103 C 66,103 66,83 92,83 C 118,83 118,114 144,114 C 170,114 170,95 196,95 C 222,95 222,76 248,76 C 274,76 274,65 300,65'
  const comedy = 'M 40,125 C 66,125 66,114 92,114 C 118,114 118,103 144,103 C 170,103 170,125 196,125 C 222,125 222,133 248,133 C 274,133 274,118 300,118'

  const dramaPoints = [[40,76],[92,50],[144,65],[196,39],[248,59],[300,50]]
  const thrillerPoints = [[40,103],[92,83],[144,114],[196,95],[248,76],[300,65]]
  const comedyPoints = [[40,125],[92,114],[144,103],[196,125],[248,133],[300,118]]
  const years = ['2019','2020','2021','2022','2023','2024']

  type LineConfig = { d: string; pts: number[][]; color: string; delay: string; label: string }
  const lines: LineConfig[] = [
    { d: drama, pts: dramaPoints, color: 'var(--accent)', delay: '0s', label: 'Drama' },
    { d: thriller, pts: thrillerPoints, color: 'var(--text-secondary)', delay: '0.15s', label: 'Thriller' },
    { d: comedy, pts: comedyPoints, color: 'var(--text-dim)', delay: '0.3s', label: 'Comedy' },
  ]

  return (
    <svg viewBox="0 0 320 210" width="100%">
      {/* Grid */}
      {[0.25,0.5,0.75,1].map(t => (
        <line key={t} x1={40} y1={20 + 150*(1-t)} x2={300} y2={20 + 150*(1-t)}
          style={{ stroke: 'var(--border)', strokeWidth: 0.5 }} />
      ))}
      {/* Lines */}
      {lines.map(line => (
        <path
          key={line.label}
          d={line.d}
          style={{
            fill: 'none',
            stroke: line.color,
            strokeWidth: line.label === 'Drama' ? 2.5 : 1.5,
            strokeDasharray: '380',
            strokeDashoffset: on ? '0' : '380',
            transition: `stroke-dashoffset 1.3s ease ${line.delay}`,
          }}
        />
      ))}
      {/* Dots */}
      {lines.map(line =>
        line.pts.map(([px, py], j) => (
          <circle key={`${line.label}-${j}`} cx={px} cy={py} r={3}
            style={{
              fill: line.color,
              opacity: on ? 1 : 0,
              transition: `opacity 0.2s ease ${parseFloat(line.delay) + 1.0 + j * 0.05}s`,
            }}
          />
        ))
      )}
      {/* X labels */}
      {years.map((yr, i) => (
        <text key={yr} x={40 + i*52} y={182} textAnchor="middle"
          style={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'Inter, sans-serif' }}>
          {yr}
        </text>
      ))}
      {/* Legend */}
      {lines.map((line, i) => (
        <g key={line.label + '-leg'}>
          <rect x={40 + i*78} y={196} width={16} height={3} rx={1.5}
            style={{ fill: line.color }} />
          <text x={60 + i*78} y={200}
            style={{ fill: line.color, fontSize: 10, fontFamily: 'Inter, sans-serif' }}>
            {line.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function WorldMapChart() {
  const [on, setOn] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setOn(true)) }, [])

  const countries = [
    { cx: 58, cy: 50, r: 9, opacity: 0.85, delay: 0 },
    { cx: 80, cy: 105, r: 7, opacity: 0.7, delay: 0.12 },
    { cx: 135, cy: 22, r: 5, opacity: 0.65, delay: 0.22 },
    { cx: 143, cy: 32, r: 4, opacity: 0.8, delay: 0.30 },
    { cx: 145, cy: 80, r: 8, opacity: 0.75, delay: 0.38 },
    { cx: 185, cy: 58, r: 6, opacity: 0.6, delay: 0.46 },
    { cx: 218, cy: 42, r: 7, opacity: 0.7, delay: 0.54 },
    { cx: 250, cy: 50, r: 5, opacity: 0.55, delay: 0.60 },
    { cx: 240, cy: 128, r: 8, opacity: 0.65, delay: 0.68 },
    { cx: 108, cy: 78, r: 5, opacity: 0.5, delay: 0.74 },
  ]

  return (
    <svg viewBox="0 0 290 160" width="100%">
      {/* Continents */}
      <polygon
        points="8,45 18,18 55,12 90,28 96,52 90,78 68,80 52,70 35,75 20,62"
        style={{ fill: 'var(--surface-raised)', stroke: 'var(--border)', strokeWidth: 0.8 }}
      />
      <polygon
        points="56,88 90,84 94,112 87,150 65,157 48,142 48,114"
        style={{ fill: 'var(--surface-raised)', stroke: 'var(--border)', strokeWidth: 0.8 }}
      />
      <polygon
        points="126,12 156,8 161,26 153,40 138,44 122,36"
        style={{ fill: 'var(--surface-raised)', stroke: 'var(--border)', strokeWidth: 0.8 }}
      />
      <polygon
        points="122,48 170,44 174,90 160,134 138,140 116,118 112,80"
        style={{ fill: 'var(--surface-raised)', stroke: 'var(--border)', strokeWidth: 0.8 }}
      />
      <polygon
        points="162,10 262,10 266,62 252,84 198,90 165,75 156,46"
        style={{ fill: 'var(--surface-raised)', stroke: 'var(--border)', strokeWidth: 0.8 }}
      />
      <polygon
        points="222,110 268,106 272,140 255,150 227,147 217,130"
        style={{ fill: 'var(--surface-raised)', stroke: 'var(--border)', strokeWidth: 0.8 }}
      />
      {/* Country highlights */}
      {countries.map((c, i) => (
        <circle
          key={i} cx={c.cx} cy={c.cy} r={c.r}
          style={{
            fill: 'var(--accent)',
            opacity: on ? c.opacity : 0,
            transition: `opacity 0.4s ease ${c.delay}s`,
          }}
        />
      ))}
      {/* Legend */}
      <circle cx={8} cy={152} r={4} style={{ fill: 'var(--accent)', opacity: 0.3 }} />
      <text x={16} y={156}
        style={{ fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'Inter, sans-serif' }}>
        1 film
      </text>
      <circle cx={55} cy={152} r={4} style={{ fill: 'var(--accent)', opacity: 0.85 }} />
      <text x={63} y={156}
        style={{ fill: 'var(--text-dim)', fontSize: 9, fontFamily: 'Inter, sans-serif' }}>
        50+ films
      </text>
    </svg>
  )
}

function CrewListChart() {
  const [on, setOn] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setOn(true)) }, [])

  const crew = [
    { rank: '01', name: 'Akira Kurosawa', count: 28, barW: 88 },
    { rank: '02', name: 'Christopher Nolan', count: 22, barW: 70 },
    { rank: '03', name: 'Wong Kar-wai', count: 17, barW: 54 },
    { rank: '04', name: 'Bong Joon-ho', count: 14, barW: 44 },
    { rank: '05', name: 'Stanley Kubrick', count: 12, barW: 38 },
    { rank: '06', name: 'Denis Villeneuve', count: 10, barW: 32 },
  ]

  return (
    <svg viewBox="0 0 320 218" width="100%">
      {crew.map((c, i) => {
        const y = 10 + i * 34
        const isTop = i === 0
        return (
          <g
            key={c.rank}
            style={{
              opacity: on ? 1 : 0,
              transition: `opacity 0.35s ease ${i * 0.1}s`,
            }}
          >
            {isTop && (
              <rect x={0} y={y - 5} width={320} height={26} rx={4}
                style={{ fill: 'var(--accent-dim)' }} />
            )}
            <text x={6} y={y + 13}
              style={{
                fill: isTop ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {c.rank}
            </text>
            <text x={32} y={y + 13}
              style={{
                fill: isTop ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {c.name}
            </text>
            <rect x={205} y={y + 3} width={c.barW} height={10} rx={2}
              style={{ fill: 'var(--accent)', opacity: isTop ? 0.8 : 0.4 }} />
            <text x={314} y={y + 13} textAnchor="end"
              style={{
                fill: isTop ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {c.count}
            </text>
          </g>
        )
      })}
      <text x={205} y={215}
        style={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'Inter, sans-serif' }}>
        directors
      </text>
    </svg>
  )
}

// ─── Slide Definitions ────────────────────────────────────────────────────────

interface SlideDef {
  heading: string
  body: string
  Chart: () => React.ReactElement
}

const SLIDES: SlideDef[] = [
  {
    heading: 'Everything, broken down.',
    body: 'Genre, language, country, decade, director, cinematographer — every dimension of your taste, mapped out further than Letterboxd goes.',
    Chart: GenreBarChart,
  },
  {
    heading: 'How your taste has shifted.',
    body: 'Year by year drift. Are you expanding into new cinema or staying in familiar territory? Cinestamp tracks it.',
    Chart: TasteLineChart,
  },
  {
    heading: 'Where your films come from.',
    body: "A world map of your watch history. Every new country is a stamp in your country passport.",
    Chart: WorldMapChart,
  },
  {
    heading: 'Beyond the director.',
    body: 'Cinematographers, composers, writers, editors — the full crew behind the films you love, ranked by how much you\'ve seen their work.',
    Chart: CrewListChart,
  },
]

// ─── Hero Section ─────────────────────────────────────────────────────────────

function HeroSection() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const fallingRef = useRef<PosterInstance[]>([])
  const queueRef = useRef<string[]>([])
  const rafRef = useRef<number>(0)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 100) {
        setScrolled(true)
        window.removeEventListener('scroll', onScroll)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    queueRef.current = shuffle(POSTER_PATHS)

    function spawnPoster(path: string, cont: HTMLDivElement): PosterInstance {
      const vw = window.innerWidth
      const el = document.createElement('img')
      el.src = `https://image.tmdb.org/t/p/w300${path}`
      el.onerror = () => { el.style.display = 'none' }
      el.style.cssText = [
        'position:absolute',
        'top:0',
        'left:0',
        'width:100px',
        'height:150px',
        'object-fit:cover',
        'border-radius:6px',
        'box-shadow:2px 4px 12px rgba(0,0,0,0.3)',
        'will-change:transform',
        'pointer-events:none',
        'user-select:none',
        'draggable:false',
      ].join(';')
      cont.appendChild(el)

      const x = Math.random() * Math.max(vw - 100, 0)
      const y = -(150 + Math.random() * 400)
      const rotation = Math.random() * 50 - 25
      el.style.transform = `translate3d(${x}px,${y}px,0) rotate(${rotation}deg)`

      return {
        path,
        el,
        x,
        y,
        vy: 0,
        rotation,
        phaseOffset: Math.random() * Math.PI * 2,
        state: 'falling',
        fadeStartTime: 0,
      }
    }

    function tick(time: number) {
      const cont = containerRef.current
      if (!cont) return
      const vh = window.innerHeight
      const vw = window.innerWidth
      const fadeStart = vh * 0.8

      // Spawn up to 18 falling
      while (fallingRef.current.length < 18 && queueRef.current.length > 0) {
        const path = queueRef.current.shift()!
        fallingRef.current.push(spawnPoster(path, cont))
      }
      if (fallingRef.current.length < 18 && queueRef.current.length === 0) {
        // Reshuffle when pool exhausted
        queueRef.current = shuffle(POSTER_PATHS)
      }

      // Update falling posters
      fallingRef.current = fallingRef.current.filter(p => {
        p.vy += 0.03
        p.y += p.vy
        p.x += Math.sin(time * 0.001 + p.phaseOffset) * 0.3
        // Clamp x to viewport
        if (p.x < -100) p.x = -100
        if (p.x > vw + 10) p.x = vw + 10
        p.el.style.transform = `translate3d(${p.x}px,${p.y}px,0) rotate(${p.rotation}deg)`

        // Remove and re-queue once fully past bottom
        if (p.y >= vh) {
          p.el.remove()
          queueRef.current.push(p.path)
          return false
        }

        // Fade linearly through last 20% of viewport
        if (p.y >= fadeStart) {
          p.el.style.opacity = String(1 - (p.y - fadeStart) / (vh - fadeStart))
        } else {
          p.el.style.opacity = '1'
        }
        return true
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      // Clean up all DOM elements
      fallingRef.current.forEach(p => { if (p.el.parentNode) p.el.remove() })
      fallingRef.current = []
    }
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
      }}
    >
      {/* Poster physics canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Glass panel */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: 'min(520px, 90vw)',
          padding: '52px 48px',
          borderRadius: 20,
          overflow: 'hidden',
          // Glass effect — rgba values required for backdrop-filter
          background: 'rgba(18, 22, 28, 0.58)',
          backdropFilter: 'blur(32px) saturate(200%) brightness(1.05)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(1.05)',
          borderTop: '1.5px solid rgba(255,255,255,0.22)',
          borderLeft: '1px solid rgba(255,255,255,0.14)',
          borderRight: '1px solid rgba(255,255,255,0.04)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          boxShadow: [
            'inset 0 2px 0 rgba(255,255,255,0.06)',
            '0 24px 48px rgba(0,0,0,0.5)',
            'inset 0 -1px 0 rgba(255,255,255,0.08)',
          ].join(', '),
          textAlign: 'center',
        }}
      >
        {/* Noise texture */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 20,
            opacity: 0.025,
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'300\' height=\'300\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            pointerEvents: 'none',
          }}
        />

        {/* Content */}
        <Logo size="lg" />

        <p
          style={{
            marginTop: 8,
            marginBottom: 32,
            fontSize: 16,
            color: 'var(--text-secondary)',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.02em',
            lineHeight: 1,
          }}
        >
          understand your taste
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/upload')}
            style={{
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              backgroundColor: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            Upload Export
          </button>
          <button
            disabled
            style={{
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              backgroundColor: 'transparent',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius)',
              cursor: 'not-allowed',
              opacity: 0.5,
            }}
          >
            Explore Demo
          </button>
        </div>

        <p
          style={{
            marginTop: 16,
            marginBottom: 32,
            fontSize: 13,
            color: 'var(--text-dim)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          get your export at{' '}
          <a
            href="https://letterboxd.com/data/export/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'underline',
              textDecorationColor: 'var(--border)',
            }}
          >
            letterboxd.com/data/export
          </a>
        </p>

        <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

        {/* Scroll indicator */}
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            opacity: scrolled ? 0 : 1,
            transition: 'opacity 0.4s ease',
            pointerEvents: scrolled ? 'none' : 'auto',
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-dim)',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            scroll to explore
          </span>
          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-dim)',
              animation: 'float 1.8s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Ticker Section ───────────────────────────────────────────────────────────

function TickerSection() {
  function Num({ children }: { children: string }) {
    return (
      <span style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>
        {children}
      </span>
    )
  }
  function Label({ children }: { children: string }) {
    return (
      <span style={{ color: 'var(--text-dim)', fontFamily: 'Inter, sans-serif' }}>
        {children}
      </span>
    )
  }
  function Dot() {
    return (
      <span style={{ color: 'var(--text-dim)', margin: '0 16px', fontFamily: 'Inter, sans-serif' }}>
        ·
      </span>
    )
  }

  const content = (
    <span style={{ whiteSpace: 'nowrap', fontSize: 14 }}>
      <Num>2,315</Num><Label> films</Label>
      <Dot />
      <Num>4,890</Num><Label> hours watched</Label>
      <Dot />
      <Num>47</Num><Label> countries explored</Label>
      <Dot />
      <Num>128</Num><Label> directors</Label>
      <Dot />
      <Num>12</Num><Label> languages</Label>
      <Dot />
      <Num>1,047</Num><Label> films rated</Label>
      <Dot />
      <Num>747</Num><Label> diary entries</Label>
      <Dot />
      <Num>6</Num><Label> years of history</Label>
      <Dot />
    </span>
  )

  return (
    <div
      style={{
        height: 72,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'inline-flex', animation: 'ticker 35s linear infinite' }}>
        {content}
        {content}
      </div>
    </div>
  )
}

// ─── Scroll Slides Section ────────────────────────────────────────────────────

function ScrollSlidesSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  })
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    return scrollYProgress.on('change', v => {
      setActiveSlide(Math.min(3, Math.floor(v * 4)))
    })
  }, [scrollYProgress])

  return (
    <div ref={sectionRef} style={{ height: '500vh', position: 'relative', backgroundColor: 'var(--bg)' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          borderTop: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {/* Slide content */}
        <div style={{ width: '100%', padding: '0 80px', position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <SlideContent slide={SLIDES[activeSlide]} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div
          style={{
            position: 'absolute',
            right: 28,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: i === activeSlide ? 24 : 6,
                borderRadius: 3,
                backgroundColor: i === activeSlide ? 'var(--accent)' : 'var(--border)',
                transition: 'height 0.3s ease, background-color 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SlideContent({ slide }: { slide: SlideDef }) {
  const Chart = slide.Chart
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'clamp(40px, 5vw, 80px)',
        maxWidth: 1100,
        margin: '0 auto',
        flexWrap: 'wrap',
      }}
    >
      {/* SVG mockup — left 55% */}
      <div
        style={{
          flex: '0 0 55%',
          minWidth: 260,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 32px',
        }}
      >
        <Chart />
      </div>

      {/* Text — right 45% */}
      <div style={{ flex: 1, minWidth: 240 }}>
        <h2
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 'clamp(28px, 3.5vw, 42px)',
            color: 'var(--text-primary)',
            margin: '0 0 16px',
            lineHeight: 1.15,
          }}
        >
          {slide.heading}
        </h2>
        <p
          style={{
            fontSize: 16,
            color: 'var(--text-secondary)',
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {slide.body}
        </p>
      </div>
    </div>
  )
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)

  function toggle(i: number) {
    setOpen(prev => (prev === i ? null : i))
  }

  return (
    <section
      style={{
        backgroundColor: 'var(--bg)',
        padding: '80px clamp(24px, 8vw, 100px)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 48,
            color: 'var(--text-primary)',
            marginBottom: 48,
            marginTop: 0,
            lineHeight: 1,
          }}
        >
          questions
        </h2>

        {FAQ_ITEMS.map((item, i) => (
          <div
            key={i}
            style={{
              borderBottom: i < FAQ_ITEMS.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <button
              onClick={() => toggle(i)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '24px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 500,
                  fontSize: 16,
                  color: open === i ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'color 0.15s ease',
                }}
              >
                {item.q}
              </span>
              <ChevronDown
                size={18}
                style={{
                  color: 'var(--accent)',
                  flexShrink: 0,
                  transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  key="answer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <p
                    style={{
                      margin: '0 0 24px',
                      paddingTop: 12,
                      fontSize: 15,
                      color: 'var(--text-secondary)',
                      fontFamily: 'Inter, sans-serif',
                      lineHeight: 1.75,
                    }}
                  >
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function FooterSection() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        padding: '80px clamp(24px, 8vw, 80px) 60px',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Two columns */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 40,
            flexWrap: 'wrap',
          }}
        >
          {/* Left */}
          <div>
            <Logo size="md" />
            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                fontSize: 14,
                color: 'var(--text-dim)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              understand your taste
            </p>
          </div>

          {/* Right */}
          <div style={{ textAlign: 'right' }}>
            <img
              src="/tmdb-logo.svg"
              alt="TMDB"
              style={{ height: 20, display: 'block', marginLeft: 'auto', opacity: 0.6 }}
            />
            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontSize: 13,
                color: 'var(--text-dim)',
                fontFamily: 'Inter, sans-serif',
                maxWidth: 260,
                lineHeight: 1.7,
                textAlign: 'right',
              }}
            >
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'var(--border)', marginTop: 60 }} />

        {/* Bottom strip */}
        <p
          style={{
            marginTop: 0,
            paddingTop: 24,
            fontSize: 13,
            color: 'var(--text-dim)',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
          }}
        >
          © 2025 Cinestamp ·{' '}
          <Link
            to="/privacy"
            style={{ color: 'var(--text-dim)', textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
          >
            Privacy
          </Link>
        </p>
      </div>
    </footer>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg)' }}>
      <HeroSection />
      <TickerSection />
      <ScrollSlidesSection />
      <FAQSection />
      <FooterSection />
    </div>
  )
}
