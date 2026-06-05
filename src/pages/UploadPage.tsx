import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud } from 'lucide-react'
import { parseLetterboxdZip } from '../lib/parser'
import { enrichAllFilms } from '../lib/tmdb'
import { db, upsertFilms } from '../db'
import { useAppStore } from '../store'
import Logo from '../components/ui/Logo'

const QUOTES = [
  { text: 'Cinema is a mirror by which we often see ourselves.', author: 'Martin Scorsese' },
  { text: 'A film is never really good unless the camera is an eye in the head of a poet.', author: 'Orson Welles' },
  { text: 'The cinema is not a craft. It is an art.', author: 'Jean-Luc Godard' },
  { text: 'Every film should have its own world.', author: 'Stanley Kubrick' },
  { text: "Cinema is a matter of what's in the frame and what's out.", author: 'Martin Scorsese' },
  { text: "Making a film is like going down a mine — once you've gone down you are completely in the dark.", author: 'John Boorman' },
]

export default function UploadPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [posterPaths, setPosterPaths] = useState<(string | null)[]>([])
  const {
    importStatus, importError, enrichmentProgress,
    setImportStatus, setImportError, setEnrichmentProgress,
    setProfile, setTotalFilms,
  } = useAppStore()

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const intervalId = setInterval(() => {
      setQuoteVisible(false)
      timeoutId = setTimeout(() => {
        setQuoteIndex(i => (i + 1) % QUOTES.length)
        setQuoteVisible(true)
      }, 500)
    }, 8000)
    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [])

  async function handleFile(file: File) {
    if (!file.name.endsWith('.zip')) {
      setImportError('Please upload a Letterboxd export ZIP file.')
      return
    }

    try {
      setImportStatus('parsing')
      setImportError(null)

      const { films, profile } = await parseLetterboxdZip(file)

      setImportStatus('saving')

      const existing = await db.films.toArray()
      const existingMap = new Map(existing.map(f => [`${f.title.trim()}|||${f.year}`, f]))

      const newFilms: typeof films = []
      const updatedFilms: typeof films = []

      for (const f of films) {
        const key = `${f.title.trim()}|||${f.year}`
        const existingFilm = existingMap.get(key)
        if (existingFilm) {
          updatedFilms.push({
            ...existingFilm,
            rating: f.rating ?? existingFilm.rating,
            ratingDate: f.ratingDate ?? existingFilm.ratingDate,
            diaryEntries: f.diaryEntries,
            onWatchlist: f.onWatchlist,
            watchlistDate: f.watchlistDate,
          })
        } else {
          newFilms.push(f)
        }
      }

      await upsertFilms(updatedFilms)
      await upsertFilms(newFilms)

      if (profile) {
        await db.profile.put(profile)
        setProfile(profile)
      }
      setTotalFilms(films.length)

      if (newFilms.length === 0) {
        setEnrichmentProgress({ status: 'done', total: 0, completed: 0, failed: 0 })
        setImportStatus('done')
        await new Promise(resolve => setTimeout(resolve, 1000))
        navigate('/overview')
        return
      }

      setImportStatus('enriching')
      setEnrichmentProgress({ status: 'running', total: newFilms.length, completed: 0, failed: 0 })
      setPosterPaths([])

      await enrichAllFilms(newFilms, (completed, total, failed, batchFilms) => {
        setEnrichmentProgress({ completed, total, failed })
        if (batchFilms) {
          setPosterPaths(prev => [
            ...prev,
            ...batchFilms.map(f => f.tmdbData?.posterPath ?? null),
          ])
        }
      })

      setEnrichmentProgress({ status: 'done' })
      setImportStatus('done')
      await new Promise(resolve => setTimeout(resolve, 1000))
      navigate('/overview')

    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Something went wrong')
      setImportStatus('error')
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const isRunning = importStatus === 'parsing' || importStatus === 'saving' || importStatus === 'enriching'
  const showLoading = isRunning || importStatus === 'done'
  const { completed, total, failed } = enrichmentProgress
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const stepLabel = (): string => {
    if (importStatus === 'parsing') return 'parsing your export'
    if (importStatus === 'saving') return 'saving to library'
    if (importStatus === 'enriching') return 'enriching with tmdb'
    if (importStatus === 'done') return 'all done'
    return ''
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Upload form */}
      {!showLoading && (
        <>
          <div className="mb-12 text-center">
            <h1
              className="font-display font-semibold tracking-tight"
              style={{ fontSize: 32, color: 'var(--text-primary)' }}
            >
              Cinestamp
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              understand your taste
            </p>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="w-full max-w-md border-2 border-dashed p-12 text-center cursor-pointer transition-colors"
            style={{
              borderRadius: 'var(--radius-lg)',
              borderColor: dragging ? 'var(--accent)' : 'var(--border)',
              backgroundColor: dragging ? 'var(--accent-dim)' : 'var(--surface)',
            }}
          >
            <div className="flex justify-center mb-4" style={{ color: 'var(--accent)' }}>
              <UploadCloud size={36} />
            </div>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              Drop your Letterboxd export here
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              or click to browse
            </p>
            <p className="mt-5 text-xs" style={{ color: 'var(--text-dim)' }}>
              Get your export at{' '}
              <a
                href="https://letterboxd.com/data/export/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="underline underline-offset-2"
                style={{ color: 'var(--accent)' }}
              >
                letterboxd.com/data/export
              </a>
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>

          {importError && (
            <p className="mt-4 text-sm" style={{ color: 'var(--danger)' }}>
              {importError}
            </p>
          )}
        </>
      )}

      {/* Cinematic loading experience */}
      {showLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3rem 1.5rem',
            overflowY: 'auto',
          }}
        >
          <Logo size="lg" />

          <p
            style={{
              fontFamily: 'Clash Display, sans-serif',
              fontSize: 20,
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginTop: 32,
              marginBottom: 0,
              letterSpacing: '-0.01em',
            }}
          >
            {stepLabel()}
          </p>

          {/* Poster grid — enriching step only */}
          {importStatus === 'enriching' && (
            <div
              style={{
                marginTop: 28,
                width: '100%',
                maxWidth: 600,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: 8,
                  maxHeight: 256,
                  overflowY: 'hidden',
                }}
              >
                {posterPaths.map((path, i) =>
                  path ? (
                    <img
                      key={i}
                      src={`https://image.tmdb.org/t/p/w154${path}`}
                      alt=""
                      style={{
                        width: '100%',
                        aspectRatio: '2/3',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-sm)',
                        display: 'block',
                        animation: 'fadeIn 200ms ease forwards',
                      }}
                    />
                  ) : (
                    <div
                      key={i}
                      style={{
                        width: '100%',
                        aspectRatio: '2/3',
                        backgroundColor: 'var(--surface)',
                        borderRadius: 'var(--radius-sm)',
                        animation: 'fadeIn 200ms ease forwards',
                      }}
                    />
                  )
                )}
              </div>

              {total > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      height: 2,
                      backgroundColor: 'var(--surface-raised)',
                      borderRadius: 1,
                      overflow: 'hidden',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: 'var(--accent)',
                        transition: 'width 0.3s ease',
                        borderRadius: 1,
                      }}
                    />
                  </div>
                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 13,
                      color: 'var(--text-dim)',
                      marginTop: 8,
                      textAlign: 'center',
                    }}
                  >
                    {completed} / {total} films{failed > 0 ? ` · ${failed} not found` : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cycling cinephile quotes */}
          <div
            style={{
              maxWidth: 480,
              marginTop: 48,
              textAlign: 'center',
              opacity: quoteVisible ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}
          >
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontStyle: 'italic',
                color: 'var(--text-dim)',
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              "{QUOTES[quoteIndex].text}"
            </p>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: 'var(--text-dim)',
                opacity: 0.6,
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              — {QUOTES[quoteIndex].author}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
