import { db } from '../db'
import type {
  Film,
  YearCount,
  YearRating,
  AttributeStat,
  MonthCount,
  DecadeStat,
  CountryStat,
  RatingBucket,
} from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decadeLabel(year: number): string {
  const d = Math.floor(year / 10) * 10
  return `${d}s`
}

function avgRating(films: Film[]): number | undefined {
  const rated = films.filter((f) => f.rating != null)
  if (!rated.length) return undefined
  return rated.reduce((sum, f) => sum + f.rating!, 0) / rated.length
}

// ─── Film type filter ─────────────────────────────────────────────────────────

export function filterFilmsByType(films: Film[], filter: string[]): Film[] {
  if (filter.includes('All') || filter.length === 0) return films

  const isMiniseries = (f: Film) =>
    (f.tmdbData?.status?.toLowerCase().includes('series') ?? false) ||
    f.tmdbData?.runtime === 0

  const isShort = (f: Film) => {
    const r = f.tmdbData?.runtime
    return r != null && r > 0 && r < 40 && !isMiniseries(f)
  }

  const isFeature = (f: Film) => {
    const r = f.tmdbData?.runtime
    return r != null && r >= 40 && !isMiniseries(f)
  }

  return films.filter(f => {
    if (filter.includes('Miniseries') && isMiniseries(f)) return true
    if (filter.includes('Shorts') && isShort(f)) return true
    if (filter.includes('Features') && isFeature(f)) return true
    return false
  })
}

// ─── All films (cached load) ──────────────────────────────────────────────────

export async function getAllFilms(): Promise<Film[]> {
  return db.films.toArray()
}

export async function getEnrichedFilms(): Promise<Film[]> {
    const all = await db.films.toArray()
    return all.filter((f) => f.enriched && !f.enrichError && f.tmdbData != null)
  }

// ─── Films per release year ───────────────────────────────────────────────────

export async function filmsPerReleaseYear(): Promise<YearCount[]> {
  const films = await getAllFilms()
  const map = new Map<number, number>()
  for (const f of films) {
    if (!f.year) continue
    map.set(f.year, (map.get(f.year) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year)
}

// ─── Diary logs per year (when watched) ──────────────────────────────────────

export async function logsPerYear(): Promise<YearCount[]> {
  const films = await getAllFilms()
  const map = new Map<number, number>()
  for (const f of films) {
    for (const d of f.diaryEntries) {
      const year = new Date(d.watchedDate).getFullYear()
      if (!isNaN(year)) map.set(year, (map.get(year) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year)
}

// ─── Logs per month (heatmap data) ───────────────────────────────────────────

export async function logsPerMonth(): Promise<MonthCount[]> {
  const films = await getAllFilms()
  const map = new Map<string, number>()
  for (const f of films) {
    for (const d of f.diaryEntries) {
      const dt = new Date(d.watchedDate)
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`
      map.set(key, (map.get(key) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([key, count]) => {
      const [year, month] = key.split('-').map(Number)
      return { year, month, count }
    })
    .sort((a, b) => a.year - b.year || a.month - b.month)
}

// ─── Rating distribution ──────────────────────────────────────────────────────

export async function ratingDistribution(): Promise<RatingBucket[]> {
  const films = await getAllFilms()
  const rated = films.filter((f) => f.rating != null)
  const map = new Map<number, number>()
  const buckets = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
  for (const b of buckets) map.set(b, 0)
  for (const f of rated) {
    const b = Math.round(f.rating! * 2) / 2
    map.set(b, (map.get(b) || 0) + 1)
  }
  return buckets.map((rating) => ({
    rating,
    count: map.get(rating) || 0,
    percentage: rated.length
      ? ((map.get(rating) || 0) / rated.length) * 100
      : 0,
  }))
}

// ─── Rating vs release year ───────────────────────────────────────────────────

export async function ratingByReleaseYear(): Promise<YearRating[]> {
  const films = await getAllFilms()
  const map = new Map<number, number[]>()
  for (const f of films) {
    if (!f.year || f.rating == null) continue
    const arr = map.get(f.year) || []
    arr.push(f.rating)
    map.set(f.year, arr)
  }
  return Array.from(map.entries())
    .map(([year, ratings]) => ({
      year,
      avgRating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      count: ratings.length,
    }))
    .sort((a, b) => a.year - b.year)
}

// ─── Decade stats ─────────────────────────────────────────────────────────────

export async function decadeStats(): Promise<DecadeStat[]> {
  const films = await getAllFilms()
  const map = new Map<string, Film[]>()
  for (const f of films) {
    if (!f.year) continue
    const d = decadeLabel(f.year)
    const arr = map.get(d) || []
    arr.push(f)
    map.set(d, arr)
  }
  return Array.from(map.entries())
    .map(([decade, fs]) => ({
      decade,
      count: fs.length,
      avgRating: avgRating(fs),
    }))
    .sort((a, b) => a.decade.localeCompare(b.decade))
}

// ─── Genre stats ─────────────────────────────────────────────────────────────

export async function genreStats(): Promise<AttributeStat[]> {
  const films = await getEnrichedFilms()
  const map = new Map<string, Film[]>()
  for (const f of films) {
    for (const g of f.tmdbData?.genres ?? []) {
      const arr = map.get(g) || []
      arr.push(f)
      map.set(g, arr)
    }
  }
  return Array.from(map.entries())
    .map(([name, fs]) => ({ name, count: fs.length, avgRating: avgRating(fs) }))
    .sort((a, b) => b.count - a.count)
}

// ─── Language stats ───────────────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
    aa: 'Afar', ab: 'Abkhazian', ae: 'Avestan', af: 'Afrikaans',
    ak: 'Akan', am: 'Amharic', an: 'Aragonese', ar: 'Arabic',
    as: 'Assamese', av: 'Avaric', ay: 'Aymara', az: 'Azerbaijani',
    ba: 'Bashkir', be: 'Belarusian', bg: 'Bulgarian', bh: 'Bihari',
    bi: 'Bislama', bm: 'Bambara', bn: 'Bengali', bo: 'Tibetan',
    br: 'Breton', bs: 'Bosnian', ca: 'Catalan', ce: 'Chechen',
    ch: 'Chamorro', cn: 'Cantonese', co: 'Corsican', cr: 'Cree',
    cs: 'Czech', cu: 'Church Slavic', cv: 'Chuvash', cy: 'Welsh',
    da: 'Danish', de: 'German', dv: 'Divehi', dz: 'Dzongkha',
    ee: 'Ewe', el: 'Greek', en: 'English', eo: 'Esperanto',
    es: 'Spanish', et: 'Estonian', eu: 'Basque', fa: 'Persian',
    ff: 'Fula', fi: 'Finnish', fj: 'Fijian', fo: 'Faroese',
    fr: 'French', fy: 'Western Frisian', ga: 'Irish', gd: 'Scottish Gaelic',
    gl: 'Galician', gn: 'Guaraní', gu: 'Gujarati', gv: 'Manx',
    ha: 'Hausa', he: 'Hebrew', hi: 'Hindi', ho: 'Hiri Motu',
    hr: 'Croatian', ht: 'Haitian Creole', hu: 'Hungarian', hy: 'Armenian',
    hz: 'Herero', ia: 'Interlingua', id: 'Indonesian', ie: 'Interlingue',
    ig: 'Igbo', ii: 'Sichuan Yi', ik: 'Inupiaq', io: 'Ido',
    is: 'Icelandic', it: 'Italian', iu: 'Inuktitut', ja: 'Japanese',
    jv: 'Javanese', ka: 'Georgian', kg: 'Kongo', ki: 'Kikuyu',
    kj: 'Kwanyama', kk: 'Kazakh', kl: 'Kalaallisut', km: 'Khmer',
    kn: 'Kannada', ko: 'Korean', kr: 'Kanuri', ks: 'Kashmiri',
    ku: 'Kurdish', kv: 'Komi', kw: 'Cornish', ky: 'Kyrgyz',
    la: 'Latin', lb: 'Luxembourgish', lg: 'Ganda', li: 'Limburgish',
    ln: 'Lingala', lo: 'Lao', lt: 'Lithuanian', lu: 'Luba-Katanga',
    lv: 'Latvian', mg: 'Malagasy', mh: 'Marshallese', mi: 'Māori',
    mk: 'Macedonian', ml: 'Malayalam', mn: 'Mongolian', mr: 'Marathi',
    ms: 'Malay', mt: 'Maltese', my: 'Burmese', na: 'Nauru',
    nb: 'Norwegian Bokmål', nd: 'North Ndebele', ne: 'Nepali', ng: 'Ndonga',
    nl: 'Dutch', nn: 'Norwegian Nynorsk', no: 'Norwegian', nr: 'South Ndebele',
    nv: 'Navajo', ny: 'Chichewa', oc: 'Occitan', oj: 'Ojibwe',
    om: 'Oromo', or: 'Odia', os: 'Ossetian', pa: 'Punjabi',
    pi: 'Pāli', pl: 'Polish', ps: 'Pashto', pt: 'Portuguese',
    qu: 'Quechua', rm: 'Romansh', rn: 'Kirundi', ro: 'Romanian',
    ru: 'Russian', rw: 'Kinyarwanda', sa: 'Sanskrit', sc: 'Sardinian',
    sd: 'Sindhi', se: 'Northern Sami', sg: 'Sango', si: 'Sinhala',
    sk: 'Slovak', sl: 'Slovenian', sm: 'Samoan', sn: 'Shona',
    so: 'Somali', sq: 'Albanian', sr: 'Serbian', ss: 'Swati',
    st: 'Southern Sotho', su: 'Sundanese', sv: 'Swedish', sw: 'Swahili',
    ta: 'Tamil', te: 'Telugu', tg: 'Tajik', th: 'Thai',
    ti: 'Tigrinya', tk: 'Turkmen', tl: 'Filipino', tn: 'Tswana',
    to: 'Tonga', tr: 'Turkish', ts: 'Tsonga', tt: 'Tatar',
    tw: 'Twi', ty: 'Tahitian', ug: 'Uyghur', uk: 'Ukrainian',
    ur: 'Urdu', uz: 'Uzbek', ve: 'Venda', vi: 'Vietnamese',
    vo: 'Volapük', wa: 'Walloon', wo: 'Wolof', xh: 'Xhosa',
    xx: 'No Language', yi: 'Yiddish', yo: 'Yoruba', za: 'Zhuang',
    zh: 'Chinese', zu: 'Zulu',
  }
  
  export function languageName(code: string): string {
    const name = LANGUAGE_NAMES[code]
    if (!name && import.meta.env.DEV) console.warn(`[cinestamp] Unmapped language code: ${code}`)
    return name ?? code
  }

  export async function languageStats(): Promise<AttributeStat[]> {
    const films = await getEnrichedFilms()
    const map = new Map<string, Film[]>()
    for (const f of films) {
      const code = f.tmdbData?.originalLanguage
      if (!code) continue
      const name = LANGUAGE_NAMES[code] ?? code
      const arr = map.get(name) || []
      arr.push(f)
      map.set(name, arr)
    }
    return Array.from(map.entries())
      .map(([name, fs]) => ({ name, count: fs.length, avgRating: avgRating(fs) }))
      .sort((a, b) => b.count - a.count)
  }

// ─── Country stats ────────────────────────────────────────────────────────────

export async function countryStats(): Promise<CountryStat[]> {
  const films = await getEnrichedFilms()
  const map = new Map<string, number>()
  for (const f of films) {
    for (const c of f.tmdbData?.productionCountries ?? []) {
      if (c === 'Antarctica') continue
      map.set(c, (map.get(c) || 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([country, count]) => ({ country, isoCode: '', count }))
    .sort((a, b) => b.count - a.count)
}

// ─── Director stats ───────────────────────────────────────────────────────────

export async function directorStats(): Promise<AttributeStat[]> {
  const films = await getEnrichedFilms()
  const map = new Map<string, Film[]>()
  for (const f of films) {
    for (const d of f.tmdbData?.directors ?? []) {
      const arr = map.get(d) || []
      arr.push(f)
      map.set(d, arr)
    }
  }
  return Array.from(map.entries())
    .map(([name, fs]) => ({ name, count: fs.length, avgRating: avgRating(fs) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)
}

// ─── Cast stats ───────────────────────────────────────────────────────────────

export async function castStats(): Promise<AttributeStat[]> {
  const films = await getEnrichedFilms()
  const map = new Map<string, Film[]>()
  for (const f of films) {
    for (const c of f.tmdbData?.cast ?? []) {
      const arr = map.get(c) || []
      arr.push(f)
      map.set(c, arr)
    }
  }
  return Array.from(map.entries())
    .map(([name, fs]) => ({ name, count: fs.length, avgRating: avgRating(fs) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)
}

// ─── Most rewatched films ─────────────────────────────────────────────────────

export async function mostRewatchedFilms(): Promise<
  { film: Film; rewatchCount: number }[]
> {
  const films = await getAllFilms()
  return films
    .filter((f) => f.diaryEntries.length > 1)
    .map((f) => ({ film: f, rewatchCount: f.diaryEntries.length }))
    .sort((a, b) => b.rewatchCount - a.rewatchCount)
    .slice(0, 20)
}

// ─── Watchlist overlap ────────────────────────────────────────────────────────

export async function watchlistOverlap(): Promise<{
  watched: number
  unwatched: number
  total: number
}> {
  const films = await getAllFilms()
  const watchlisted = films.filter((f) => f.onWatchlist)
  // Films on watchlist that are also in watched
  const watchedFromWatchlist = watchlisted.filter((f) => !f.onWatchlist).length
  return {
    watched: watchedFromWatchlist,
    unwatched: watchlisted.length,
    total: films.length,
  }
}