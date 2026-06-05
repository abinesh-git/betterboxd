import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud } from 'lucide-react'
import { parseLetterboxdZip } from '../lib/parser'
import { enrichAllFilms } from '../lib/tmdb'
import { db, upsertFilms } from '../db'
import { useAppStore } from '../store'

export default function UploadPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const {
    importStatus, importError, enrichmentProgress,
    setImportStatus, setImportError, setEnrichmentProgress,
    setProfile, setTotalFilms,
  } = useAppStore()

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
        navigate('/overview')
        return
      }

      setImportStatus('enriching')
      setEnrichmentProgress({ status: 'running', total: newFilms.length, completed: 0, failed: 0 })

      await enrichAllFilms(newFilms, (completed, total, failed) => {
        setEnrichmentProgress({ completed, total, failed })
      })

      setEnrichmentProgress({ status: 'done' })
      setImportStatus('done')
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
  const { completed, total, failed } = enrichmentProgress
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Logo */}
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

      {!isRunning && importStatus !== 'done' && (
        <>
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

      {isRunning && (
        <div className="w-full max-w-md">
          <div
            className="p-6"
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}
              />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {importStatus === 'parsing' && 'Reading your export...'}
                {importStatus === 'saving' && 'Saving to local storage...'}
                {importStatus === 'enriching' && (
                  total === 0 ? 'Finishing up...' : `Fetching film data — ${pct}%`
                )}
              </span>
            </div>

            {importStatus === 'enriching' && total > 0 && (
              <>
                <div
                  className="w-full"
                  style={{
                    backgroundColor: 'var(--surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    height: 6,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      backgroundColor: 'var(--accent)',
                      borderRadius: 'var(--radius-sm)',
                      height: 6,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span style={{ color: 'var(--text-dim)' }}>{completed} / {total} films</span>
                  {failed > 0 && (
                    <span style={{ color: 'var(--text-secondary)' }}>{failed} not found</span>
                  )}
                </div>
                <p className="mt-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                  This takes a few minutes — TMDB rate-limits at 35 films per 10s.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
