import { useRef, useState } from 'react'
import { parseLetterboxdZip } from '../lib/parser'
import { enrichAllFilms } from '../lib/tmdb'
import { db, clearAll, upsertFilms } from '../db'
import { useAppStore } from '../store'

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { importStatus, importError, enrichmentProgress,
    setImportStatus, setImportError, setEnrichmentProgress,
    setProfile, setTotalFilms } = useAppStore()

    async function handleFile(file: File) {
        if (!file.name.endsWith('.zip')) {
          setImportError('Please upload a Letterboxd export ZIP file')
          return
        }
      
        try {
          setImportStatus('parsing')
          setImportError(null)
      
          const { films, profile } = await parseLetterboxdZip(file)
      
          setImportStatus('saving')
      
          // Get existing URIs from DB
          const existing = await db.films.toArray()
          const existingMap = new Map(existing.map(f => [`${f.title.trim()}|||${f.year}`, f]))
      
          // Split into new vs existing
          const newFilms: typeof films = []
          const updatedFilms: typeof films = []
      
          for (const f of films) {
            const key = `${f.title.trim()}|||${f.year}`
            const existingFilm = existingMap.get(key)
            if (existingFilm) {
              // Keep enrichment, just update ratings/diary
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
      
          // Save updated films (preserve enrichment)
          await upsertFilms(updatedFilms)
      
          // Save new films
          await upsertFilms(newFilms)
      
          if (profile) {
            await db.profile.put(profile)
            setProfile(profile)
          }
          setTotalFilms(films.length)
      
          if (newFilms.length === 0) {
            // Nothing new to enrich
            setEnrichmentProgress({ status: 'done', total: 0, completed: 0, failed: 0 })
            setImportStatus('done')
            window.location.reload()
            return
          }
      
          setImportStatus('enriching')
          setEnrichmentProgress({ status: 'running', total: newFilms.length, completed: 0, failed: 0 })
      
          await enrichAllFilms(newFilms, (completed, total, failed) => {
            setEnrichmentProgress({ completed, total, failed })
          })
      
          setEnrichmentProgress({ status: 'done' })
          setImportStatus('done')
          window.location.reload()
      
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
    <div className="min-h-screen bg-[#14181c] flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white tracking-tight">betterboxd</h1>
        <p className="text-[#99aabb] mt-2 text-sm">your letterboxd data, actually visualised</p>
      </div>

      {!isRunning && importStatus !== 'done' && (
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`w-full max-w-md border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
            ${dragging ? 'border-[#00c030] bg-[#00c030]/5' : 'border-[#456] hover:border-[#99aabb]'}`}
        >
          <div className="text-5xl mb-4">📦</div>
          <p className="text-white font-medium">drop your letterboxd export zip</p>
          <p className="text-[#99aabb] text-sm mt-2">or click to browse</p>
          <p className="text-[#456] text-xs mt-4">
            export from letterboxd.com → settings → import & export → export your data
          </p>
          <input ref={fileRef} type="file" accept=".zip" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      )}

      {importError && (
        <p className="text-red-400 text-sm mt-4">{importError}</p>
      )}

      {isRunning && (
        <div className="w-full max-w-md">
          <div className="bg-[#1c2228] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#00c030] animate-pulse" />
              <span className="text-white text-sm font-medium">
                {importStatus === 'parsing' && 'parsing your export...'}
                {importStatus === 'saving' && 'saving to local db...'}
                {importStatus === 'enriching' && `enriching with tmdb data... ${pct}%`}
                {importStatus === 'enriching' && total === 0
                     ? 'no new films to enrich, finishing up...'
                     : `enriching with tmdb data... ${pct}%`}
              </span>
            </div>

            {importStatus === 'enriching' && (
              <>
                <div className="w-full bg-[#2c3440] rounded-full h-1.5 mb-2">
                  <div
                    className="bg-[#00c030] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#99aabb]">
                  <span>{completed} / {total} films</span>
                  {failed > 0 && <span className="text-yellow-500">{failed} not found</span>}
                </div>
                <p className="text-[#456] text-xs mt-3">
                  this takes a few minutes — tmdb rate limits at 35 films per 10s
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}