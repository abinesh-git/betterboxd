import type { Film, TMDBData, CachedPerson } from '../types'
import { db, getPerson, savePerson } from '../db'

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
  const url = `${BASE}/movie/${tmdbId}?append_to_response=credits,keywords&language=en-US`
  const res = await fetch(url, { headers })
  if (!res.ok) return null

  const d = await res.json()

  const crew: any[] = d.credits?.crew ?? []

  const directors: string[] = crew
    .filter((c: any) => c.job === 'Director')
    .map((c: any) => c.name as string)

  const cinematographers: string[] = crew
    .filter((c: any) => c.job === 'Director of Photography')
    .map((c: any) => c.name as string)

  const composers: string[] = crew
    .filter((c: any) => c.job === 'Original Music Composer')
    .map((c: any) => c.name as string)

  const screenwriters: string[] = crew
    .filter((c: any) => ['Screenplay', 'Story', 'Writer'].includes(c.job))
    .map((c: any) => c.name as string)

  const editors: string[] = crew
    .filter((c: any) => c.job === 'Editor')
    .map((c: any) => c.name as string)

  const cast: string[] = (d.credits?.cast ?? [])
    .slice(0, 10)
    .map((c: any) => c.name as string)

  const keywords: string[] = (d.keywords?.keywords ?? []).map((k: any) => k.name as string)
  const isAdaptation = keywords.some(k => k.toLowerCase().includes('based on'))

  const productionCompanies = (d.production_companies ?? []).map((c: any) => ({
    id: c.id as number,
    name: c.name as string,
    originCountry: c.origin_country as string,
  }))

  return {
    tmdbId,

    // Basic metadata
    originalTitle: (d.original_title as string) ?? '',
    tagline: d.tagline || undefined,
    overview: d.overview || undefined,
    status: d.status || undefined,
    tmdbReleaseDate: d.release_date || undefined,
    budget: d.budget > 0 ? (d.budget as number) : undefined,
    revenue: d.revenue > 0 ? (d.revenue as number) : undefined,
    popularity: d.popularity ?? undefined,
    voteCount: d.vote_count ?? undefined,
    imdbId: d.imdb_id || undefined,

    // Media
    posterPath: d.poster_path || undefined,
    backdropPath: d.backdrop_path || undefined,

    // Classification
    genres: (d.genres ?? []).map((g: any) => g.name as string),
    keywords,
    isAdaptation,
    originalLanguage: d.original_language ?? '',
    spokenLanguages: (d.spoken_languages ?? []).map((l: any) => l.english_name as string),
    productionCountries: (d.production_countries ?? []).map((c: any) => c.name as string),

    // Companies
    productionCompanies,

    // Crew
    directors,
    cast,
    cinematographers,
    composers,
    screenwriters,
    editors,

    // Collection
    collection: d.belongs_to_collection
      ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name }
      : undefined,

    // Ratings / runtime
    tmdbRating: d.vote_average || undefined,
    runtime: d.runtime || undefined,

    fetchedAt: new Date().toISOString(),
  }
}

function computeReleaseToWatchGap(film: Film, tmdbReleaseDate?: string): number | undefined {
  if (!tmdbReleaseDate) return undefined
  const releaseMs = new Date(tmdbReleaseDate).getTime()
  if (isNaN(releaseMs)) return undefined
  // Use earliest diary watchedDate, fall back to dateAdded
  const watchDates = film.diaryEntries.map(e => e.watchedDate).filter(Boolean).sort()
  const firstWatchStr = watchDates[0] ?? film.dateAdded
  if (!firstWatchStr) return undefined
  const watchMs = new Date(firstWatchStr).getTime()
  if (isNaN(watchMs)) return undefined
  return Math.round((watchMs - releaseMs) / 86_400_000)
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

    const releaseToWatchGapDays = computeReleaseToWatchGap(film, tmdbData.tmdbReleaseDate)

    return { ...film, tmdbId, tmdbData, releaseToWatchGapDays, enriched: true, enrichError: false }
  } catch {
    return { ...film, enriched: true, enrichError: true }
  }
}

// ─── Partial re-enrichment (fills in missing fields on already-enriched films) ─

export async function reEnrichMissingFields(
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<void> {
  const all = await db.films.toArray()
  // Target: enriched films that have a tmdbId but are missing imdbId in tmdbData
  const targets = all.filter(
    (f) =>
      f.enriched &&
      !f.enrichError &&
      f.tmdbId != null &&
      f.tmdbData != null &&
      !f.tmdbData.imdbId
  )
  const total = targets.length
  let completed = 0
  let failed = 0

  if (total === 0) {
    onProgress(0, 0, 0)
    return
  }

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    if (signal?.aborted) break

    const batch = targets.slice(i, i + BATCH_SIZE)

    const updated = await Promise.all(
      batch.map(async (film) => {
        try {
          const tmdbData = await fetchTMDBDetails(film.tmdbId!)
          if (!tmdbData) return { ...film, enrichError: true }
          const releaseToWatchGapDays = computeReleaseToWatchGap(film, tmdbData.tmdbReleaseDate)
          return { ...film, tmdbData, releaseToWatchGapDays, enrichError: false }
        } catch {
          return { ...film, enrichError: true }
        }
      })
    )

    await db.films.bulkPut(updated)

    completed += updated.length
    failed += updated.filter((f) => f.enrichError).length
    onProgress(completed, total, failed)

    if (i + BATCH_SIZE < targets.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }
}

// ─── Person data ─────────────────────────────────────────────────────────────

export interface PersonCredit {
  tmdbId: number
  title: string
  year: number
  popularity: number
  posterPath?: string
  tmdbRating?: number
}

export async function fetchPersonByName(name: string): Promise<CachedPerson | null> {
  const cached = await getPerson(name)
  if (cached) return cached

  try {
    const searchRes = await fetch(
      `${BASE}/search/person?query=${encodeURIComponent(name)}&language=en-US`,
      { headers }
    )
    if (!searchRes.ok) return null
    const searchData = await searchRes.json()
    const first = searchData.results?.[0]
    if (!first) return null

    const detailRes = await fetch(`${BASE}/person/${first.id}?language=en-US`, { headers })
    if (!detailRes.ok) return null
    const d = await detailRes.json()

    const person: CachedPerson = {
      tmdbPersonId: d.id as number,
      name: d.name as string,
      profilePath: d.profile_path || undefined,
      biography: d.biography || undefined,
      birthday: d.birthday || undefined,
      placeOfBirth: d.place_of_birth || undefined,
      knownForDepartment: d.known_for_department || undefined,
      fetchedAt: new Date().toISOString(),
    }

    await savePerson(person)
    return person
  } catch {
    return null
  }
}

export async function fetchPersonMovieCredits(tmdbPersonId: number): Promise<PersonCredit[]> {
  try {
    const res = await fetch(
      `${BASE}/person/${tmdbPersonId}/movie_credits?language=en-US`,
      { headers }
    )
    if (!res.ok) return []
    const data = await res.json()

    const seen = new Set<number>()
    const credits: PersonCredit[] = []
    for (const m of [...(data.cast ?? []), ...(data.crew ?? [])]) {
      if (!m.title || !m.release_date || seen.has(m.id as number)) continue
      seen.add(m.id as number)
      credits.push({
        tmdbId: m.id as number,
        title: m.title as string,
        year: new Date(m.release_date as string).getFullYear(),
        popularity: (m.popularity as number) ?? 0,
        posterPath: m.poster_path || undefined,
        tmdbRating: m.vote_average || undefined,
      })
    }
    return credits.sort((a, b) => b.popularity - a.popularity)
  } catch {
    return []
  }
}

// ─── Batch enrichment pipeline ───────────────────────────────────────────────

export type ProgressCallback = (completed: number, total: number, failed: number, newFilms?: Film[]) => void

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
    onProgress(completed, total, failed, enriched)

    // Rate limit: wait between batches (not after the last one)
    if (i + BATCH_SIZE < unenriched.length) {
      await sleep(BATCH_DELAY_MS)
    }
  }
}