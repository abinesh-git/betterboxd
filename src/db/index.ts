import Dexie, { type Table } from 'dexie'
import type { Film, UserProfile } from '../types'

export class BetterBoxdDB extends Dexie {
  films!: Table<Film, string>       // keyed by uri
  profile!: Table<UserProfile, string> // keyed by username

  constructor() {
    super('betterboxd')

    this.version(1).stores({
      // Index the fields we query/filter/sort by
      // uri is the primary key (inbound)
      films: 'uri, title, year, rating, enriched, onWatchlist',
      profile: 'username',
    })
  }
}

export const db = new BetterBoxdDB()

// ─── Helper: clear all data (for re-import) ──────────────────────────────────

export async function clearAll() {
  await db.films.clear()
  await db.profile.clear()
}

// ─── Helper: get enrichment queue (films without tmdb data) ─────────────────

export async function getUnenrichedFilms(): Promise<Film[]> {
  return db.films.where('enriched').equals(0 as any).toArray()
}

// ─── Helper: bulk upsert films ───────────────────────────────────────────────

export async function upsertFilms(films: Film[]) {
  await db.films.bulkPut(films)
}