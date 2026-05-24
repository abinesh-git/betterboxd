import type { Film, TMDBData } from '../types'
import { db } from '../db'

const BASE = 'https://api.themoviedb.org/3'
const TOKEN = import.meta.env.VITE_TMDB_READ_TOKEN as string

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
}

// ─── Rate limiting: 40 req / 10s ────────────────────────────────────────────

const BATCH_SIZE = 35
const BATCH_DELAY_MS = 10500 // 10.5s to be safe

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Single film enrichment ──────────────────────────────────────────────────

async function fetchTMDBBySearch(
  title: string,
  year: number
): Promise<number | null> {
  const url = new URL(`${BASE}/search/movie`)
  url.searchParams.set('query', title)
  url.searchParams.set('year', String(year))
  url.searchParams.set('language', 'en-US')

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) return null

  const data = await res.json()
  if (!data.results?.length) {
    // Retry without year constraint (catches some edge cases)
    const url2 = new URL(`${BASE}/search/movie`)
    url2.searchParams.set('query', title)
    const res2 = await fetch(url2.toString(), { headers })
    if (!res2.ok) return null
    const data2 = await res2.json()
    return data2.results?.[0]?.id ?? null
  }

  // Pick highest popularity match
  const sorted = [...data.results].sort((a, b) => b.popularity - a.popularity)
  return sorted[0].id
}

async function fetchTMDBDetails(tmdbId: number): Promise<TMDBData | null> {
  const url = `${BASE}/movie/${tmdbId}?append_to_response=credits&language=en-US`
  const res = await fetch(url, { headers })
  if (!res.ok) return null

  const d = await res.json()

  const directors: string[] = (d.credits?.crew ?? [])
    .filter((c: any) => c.job === 'Director')
    .map((c: any) => c.name as string)

  const cast: string[] = (d.credits?.cast ?? [])
    .slice(0, 10)
    .map((c: any) => c.name as string)

  return {
    tmdbId,
    genres: (d.genres ?? []).map((g: any) => g.name as string),
    originalLanguage: d.original_language ?? '',
    spokenLanguages: (d.spoken_languages ?? []).map(
      (l: any) => l.english_name as string
    ),
    productionCountries: (d.production_countries ?? []).map(
      (c: any) => c.name as string
    ),
    directors,
    cast,
    runtime: d.runtime ?? undefined,
    tmdbRating: d.vote_average ?? undefined,
    posterPath: d.poster_path ?? undefined,
    collection: d.belongs_to_collection
      ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name }
      : undefined,
    fetchedAt: new Date().toISOString(),
  }
}

export async function enrichFilm(film: Film): Promise<Film> {
  try {
    const tmdbId = await fetchTMDBBySearch(film.title, film.year)
    if (!tmdbId) {
      return { ...film, enriched: true, enrichError: true }
    }

    const tmdbData = await fetchTMDBDetails(tmdbId)
    if (!tmdbData) {
      return { ...film, enriched: true, enrichError: true }
    }

    return { ...film, tmdbId, tmdbData, enriched: true, enrichError: false }
  } catch {
    return { ...film, enriched: true, enrichError: true }
  }
}

// ─── Batch enrichment pipeline ───────────────────────────────────────────────

export type ProgressCallback = (completed: number, total: number, failed: number) => void

export async function enrichAllFilms(
  films: Film[],
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<void> {
  const unenriched = films.filter((f) => !f.enriched)
  const total = unenriched.length
  let completed = 0
  let failed = 0

  if (total === 0) {
    onProgress(0, 0, 0)
    return
  }

  for (let i = 0; i < unenriched.length; i += BATCH_SIZE) {
    if (signal?.aborted) break

    const batch = unenriched.slice(i, i + BATCH_SIZE)

    const enriched = await Promise.all(batch.map((f) => enrichFilm(f)))

    // Save batch to DB
    await db.films.bulkPut(enriched)

    completed += enriched.length
    failed += enriched.filter((f) => f.enrichError).length
    onProgress(completed, total, failed)

    // Rate limit: wait between batches (not after the last one)
    if (i + BATCH_SIZE < unenriched.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }
}