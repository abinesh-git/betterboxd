import Dexie, { type Table } from 'dexie'
import type { Film, UserProfile, CachedPerson } from '../types'

export class BetterBoxdDB extends Dexie {
  films!: Table<Film, string>
  profile!: Table<UserProfile, string>
  persons!: Table<CachedPerson, number>

  constructor() {
    super('betterboxd')

    this.version(1).stores({
      films: 'uri, title, year, rating, enriched, onWatchlist',
      profile: 'username',
    })

    this.version(2).stores({
      persons: 'tmdbPersonId, name',
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

// ─── Person cache helpers ────────────────────────────────────────────────────

export async function getPerson(name: string): Promise<CachedPerson | null> {
  const result = await db.persons.where('name').equals(name).first()
  return result ?? null
}

export async function savePerson(person: CachedPerson): Promise<void> {
  await db.persons.put(person)
}
