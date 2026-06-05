import JSZip from 'jszip'
import Papa from 'papaparse'
import type {
  RawWatchedEntry,
  RawDiaryEntry,
  RawRatingEntry,
  RawWatchlistEntry,
  RawProfileEntry,
  Film,
  DiaryEntry,
  UserProfile,
} from '../types'

function parseCSV<T>(text: string): T[] {
  const result = Papa.parse<T>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  })
  return result.data
}

export interface ParseResult {
  films: Film[]
  profile: UserProfile | null
  watchlistUris: Set<string>
}

export async function parseLetterboxdZip(file: File): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(file)

  async function readCSV(filename: string): Promise<string | null> {
    const entry = Object.keys(zip.files).find(
      (k) => k.endsWith(`/${filename}`) || k === filename
    )
    if (!entry) return null
    return zip.files[entry].async('string')
  }

  const [watchedRaw, diaryRaw, ratingsRaw, watchlistRaw, profileRaw] =
    await Promise.all([
      readCSV('watched.csv'),
      readCSV('diary.csv'),
      readCSV('ratings.csv'),
      readCSV('watchlist.csv'),
      readCSV('profile.csv'),
    ])

  const watched = watchedRaw ? parseCSV<RawWatchedEntry>(watchedRaw) : []
  const diary = diaryRaw ? parseCSV<RawDiaryEntry>(diaryRaw) : []
  const ratings = ratingsRaw ? parseCSV<RawRatingEntry>(ratingsRaw) : []
  const watchlist = watchlistRaw ? parseCSV<RawWatchlistEntry>(watchlistRaw) : []
  const profileRows = profileRaw ? parseCSV<RawProfileEntry>(profileRaw) : []

  // Ratings map: uri → { rating, date }
  const ratingsMap = new Map<string, { rating: number; date: string }>()
  for (const r of ratings) {
    if (r['Letterboxd URI'] && r.Rating) {
      ratingsMap.set(r['Letterboxd URI'], {
        rating: parseFloat(r.Rating),
        date: r.Date,
      })
    }
  }

  // Ratings fallback: name+year → { rating, date }
  const ratingsKeyMap = new Map<string, { rating: number; date: string }>()
  for (const r of ratings) {
    if (r.Name && r.Rating) {
      const key = `${r.Name.trim()}|||${parseInt(r.Year) || 0}`
      ratingsKeyMap.set(key, { rating: parseFloat(r.Rating), date: r.Date })
    }
  }

  // Watchlist map: uri → date
  const watchlistMap = new Map<string, string>()
  for (const w of watchlist) {
    if (w['Letterboxd URI']) {
      watchlistMap.set(w['Letterboxd URI'], w.Date)
    }
  }

  const filmMap = new Map<string, Film>()

  // Process watched.csv — primary source of truth
  for (const w of watched) {
    const uri = w['Letterboxd URI']
    if (!uri) continue
    const ratingData =
      ratingsMap.get(uri) ??
      ratingsKeyMap.get(`${w.Name?.trim()}|||${parseInt(w.Year) || 0}`)
    filmMap.set(uri, {
      uri,
      title: w.Name,
      year: parseInt(w.Year) || 0,
      dateAdded: w.Date,
      rating: ratingData?.rating,
      ratingDate: ratingData?.date,
      diaryEntries: [],
      onWatchlist: watchlistMap.has(uri),
      watchlistDate: watchlistMap.get(uri),
      releaseToWatchGapDays: undefined,
      enriched: false,
    })
  }

  // Build name+year lookup from watched films for diary merging
  const watchedKeyMap = new Map<string, Film>()
  for (const [, film] of filmMap) {
    const key = `${film.title.trim()}|||${film.year}`
    watchedKeyMap.set(key, film)
  }

  // Merge diary entries into existing films by Name+Year
  for (const d of diary) {
    const key = `${d.Name?.trim()}|||${parseInt(d.Year) || 0}`
    const entry: DiaryEntry = {
      watchedDate: d['Watched Date'] || d.Date,
      loggedDate: d.Date,
      rating: d.Rating ? parseFloat(d.Rating) : undefined,
      rewatch: d.Rewatch?.toLowerCase() === 'yes',
      tags: d.Tags
        ? d.Tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    }

    const existing = watchedKeyMap.get(key)
    if (existing) {
      existing.diaryEntries.push(entry)
    } else {
      // Genuinely diary-only film (not in watched.csv)
      const uri = d['Letterboxd URI']
      if (!uri || filmMap.has(uri)) continue
      const ratingData =
        ratingsMap.get(uri) ??
        ratingsKeyMap.get(key)
      filmMap.set(uri, {
        uri,
        title: d.Name,
        year: parseInt(d.Year) || 0,
        dateAdded: d.Date,
        rating: ratingData?.rating,
        ratingDate: ratingData?.date,
        diaryEntries: [entry],
        onWatchlist: watchlistMap.has(uri),
        watchlistDate: watchlistMap.get(uri),
        releaseToWatchGapDays: undefined,
        enriched: false,
      })
    }
  }

  let profile: UserProfile | null = null
  if (profileRows.length > 0) {
    const p = profileRows[0]
    profile = {
      username: p.Username || '',
      givenName: p['Given Name'] || '',
      familyName: p['Family Name'] || '',
      location: p.Location || '',
      dateJoined: p['Date Joined'] || '',
      favoriteFilmUris: p['Favorite Films']
        ? p['Favorite Films'].split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }
  }

  return {
    films: Array.from(filmMap.values()),
    profile,
    watchlistUris: new Set(watchlistMap.keys()),
  }
}