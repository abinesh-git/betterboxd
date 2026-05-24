// ─── Raw CSV row types (as parsed from Letterboxd export) ───────────────────

export interface RawWatchedEntry {
  Date: string
  Name: string
  Year: string
  'Letterboxd URI': string
}

export interface RawDiaryEntry {
  Date: string
  Name: string
  Year: string
  'Letterboxd URI': string
  Rating: string
  Rewatch: string
  Tags: string
  'Watched Date': string
}

export interface RawRatingEntry {
  Date: string
  Name: string
  Year: string
  'Letterboxd URI': string
  Rating: string
}

export interface RawWatchlistEntry {
  Date: string
  Name: string
  Year: string
  'Letterboxd URI': string
}

export interface RawReviewEntry {
  Date: string
  Name: string
  Year: string
  'Letterboxd URI': string
  Rating: string
  Rewatch: string
  Review: string
  Tags: string
  'Watched Date': string
}

export interface RawProfileEntry {
  'Date Joined': string
  Username: string
  'Given Name': string
  'Family Name': string
  'Email Address': string
  Location: string
  Website: string
  Bio: string
  Pronoun: string
  'Favorite Films': string
}

// ─── Normalised internal types (stored in IndexedDB) ────────────────────────

export interface Film {
  // Primary key
  uri: string                    // e.g. https://boxd.it/hTha

  // From CSVs
  title: string
  year: number
  dateAdded: string              // when first appeared in watched.csv

  // From ratings.csv
  rating?: number                // 0.5–5, the "canonical" rating
  ratingDate?: string

  // From diary.csv (may have multiple entries for rewatches)
  diaryEntries: DiaryEntry[]

  // From watchlist.csv
  onWatchlist: boolean
  watchlistDate?: string

  // TMDB enrichment (populated after API calls)
  tmdbId?: number
  tmdbData?: TMDBData

  // Enrichment status
  enriched: boolean
  enrichError?: boolean
}

export interface DiaryEntry {
  watchedDate: string
  loggedDate: string
  rating?: number
  rewatch: boolean
  tags: string[]
}

export interface TMDBData {
  tmdbId: number
  genres: string[]
  originalLanguage: string
  spokenLanguages: string[]
  productionCountries: string[]
  directors: string[]
  cast: string[]                 // top 10
  runtime?: number
  tmdbRating?: number            // vote_average
  posterPath?: string
  collection?: {
    id: number
    name: string
  }
  fetchedAt: string
}

// ─── Profile ────────────────────────────────────────────────────────────────

export interface UserProfile {
  username: string
  givenName: string
  familyName: string
  location: string
  dateJoined: string
  favoriteFilmUris: string[]
}

// ─── App-level state types ───────────────────────────────────────────────────

export type EnrichmentStatus = 'idle' | 'running' | 'done' | 'error'

export interface EnrichmentProgress {
  status: EnrichmentStatus
  total: number
  completed: number
  failed: number
}

// ─── Stats types (computed from DB, used by charts) ─────────────────────────

export interface YearCount {
  year: number
  count: number
}

export interface YearRating {
  year: number
  avgRating: number
  count: number
}

export interface AttributeStat {
  name: string
  count: number
  avgRating?: number
}

export interface MonthCount {
  year: number
  month: number          // 1–12
  count: number
}

export interface DecadeStat {
  decade: string         // e.g. "1990s"
  count: number
  avgRating?: number
}

export interface CountryStat {
  country: string
  isoCode: string
  count: number
}

export interface RatingBucket {
  rating: number         // 0.5, 1.0, ... 5.0
  count: number
  percentage: number
}