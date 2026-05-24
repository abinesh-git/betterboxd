import { useEffect, useState } from 'react'
import { useAppStore } from '../store'
import { db } from '../db'
import {
  filmsPerReleaseYear, logsPerYear, ratingDistribution,
  ratingByReleaseYear, decadeStats, genreStats, languageStats,
  countryStats, directorStats, castStats, mostRewatchedFilms
} from '../lib/stats'
import type {
  YearCount, YearRating, AttributeStat,
  DecadeStat, CountryStat, RatingBucket
} from '../types'

import StatCard from '../components/ui/StatCard'
import SectionHeader from '../components/ui/SectionHeader'
import BarChartCard from '../components/charts/BarChartCard'
import RatingDistChart from '../components/charts/RatingDistChart'
import DecadeChart from '../components/charts/DecadeChart'
import AttributeTable from '../components/charts/AttributeTable'
import RewatchList from '../components/charts/RewatchList'
import WorldMap from '../components/map/WorldMap'

export default function DashboardPage() {
  const { profile, totalFilms } = useAppStore()

  const [releaseYears, setReleaseYears] = useState<YearCount[]>([])
  const [logsYear, setLogsYear] = useState<YearCount[]>([])
  const [ratingDist, setRatingDist] = useState<RatingBucket[]>([])
  const [ratingYear, setRatingYear] = useState<YearRating[]>([])
  const [decades, setDecades] = useState<DecadeStat[]>([])
  const [genres, setGenres] = useState<AttributeStat[]>([])
  const [languages, setLanguages] = useState<AttributeStat[]>([])
  const [countries, setCountries] = useState<CountryStat[]>([])
  const [directors, setDirectors] = useState<AttributeStat[]>([])
  const [cast, setCast] = useState<AttributeStat[]>([])
  const [rewatched, setRewatched] = useState<Awaited<ReturnType<typeof mostRewatchedFilms>>>([])
  const [ratedCount, setRatedCount] = useState(0)
  const [enrichedCount, setEnrichedCount] = useState(0)

  useEffect(() => {
    async function load() {
      const [ry, ly, rd, ryear, dec, gen, lang, ctry, dir, cst, rew] =
        await Promise.all([
          filmsPerReleaseYear(),
          logsPerYear(),
          ratingDistribution(),
          ratingByReleaseYear(),
          decadeStats(),
          genreStats(),
          languageStats(),
          countryStats(),
          directorStats(),
          castStats(),
          mostRewatchedFilms(),
        ])

      setReleaseYears(ry)
      setLogsYear(ly)
      setRatingDist(rd)
      setRatingYear(ryear)
      setDecades(dec)
      setGenres(gen)
      setLanguages(lang)
      setCountries(ctry)
      setDirectors(dir)
      setCast(cst)
      setRewatched(rew)

      const rated = await db.films.where('rating').above(0).count()
      const enriched = await db.films.where('enriched').equals(1 as any).count()
      setRatedCount(rated)
      setEnrichedCount(enriched)
    }
    load()
  }, [])


  return (
    <div className="min-h-screen bg-[#14181c] text-white">
      {/* Header */}
      <div className="border-b border-[#2c3440] px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">betterboxd</h1>
        <div className="flex items-center gap-3">
          <span className="text-[#99aabb] text-sm">
            {profile?.username && `@${profile.username}`}
          </span>
          <button
            onClick={async () => {
                if (confirm('Re-import data? This will clear all existing data.')) {
                     const { clearAll } = await import('../db')
                     await clearAll()
                     window.location.reload()
                }
            }}
            className="text-xs text-[#456] hover:text-[#99aabb] transition-colors"
            >
             re-import
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

            {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="films watched" value={totalFilms.toLocaleString()} />
        <StatCard label="films rated" value={ratedCount.toLocaleString()} />
        <StatCard label="your avg rating" value={
            ratingDist.length
            ? (ratingDist.reduce((s, d) => s + d.rating * d.count, 0) /
                ratingDist.reduce((s, d) => s + d.count, 0)).toFixed(2)
            : '—'
        } />
        </div>


        {/* Viewing history */}
        <section>
          <SectionHeader title="viewing history" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BarChartCard
              title="films by release year"
              data={releaseYears}
              xKey="year"
              yKey="count"
            />
            <BarChartCard
              title="films logged per year"
              data={logsYear}
              xKey="year"
              yKey="count"
            />
          </div>
        </section>

        {/* Ratings */}
        <section>
          <SectionHeader title="ratings" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RatingDistChart data={ratingDist} />
            <BarChartCard
              title="avg rating by release year"
              data={ratingYear.filter(d => d.count >= 3)}
              xKey="year"
              yKey="avgRating"
              domain={[0.5, 5]}
              color="#f5c518"
            />
          </div>
        </section>

        {/* Decades */}
        <section>
          <SectionHeader title="by decade" />
          <DecadeChart data={decades} />
        </section>

        {/* Genres */}
        <section>
          <SectionHeader title="genres" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AttributeTable title="most watched genres" data={genres.slice(0, 10)} metric="count" />
            <AttributeTable title="highest rated genres" data={[...genres].sort((a,b) => (b.avgRating??0)-(a.avgRating??0)).slice(0,10)} metric="rating" />
          </div>
        </section>

        {/* Languages */}
        <section>
          <SectionHeader title="languages" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AttributeTable title="most watched languages" data={languages.slice(0, 10)} metric="count" />
            <AttributeTable title="highest rated languages" data={[...languages].sort((a,b) => (b.avgRating??0)-(a.avgRating??0)).slice(0,10)} metric="rating" />
          </div>
        </section>

        {/* World map */}
        <section>
          <SectionHeader title="films by country" />
          <WorldMap data={countries} />
        </section>

        {/* Directors & Cast */}
        <section>
          <SectionHeader title="directors" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AttributeTable title="most watched directors" data={directors.slice(0, 10)} metric="count" />
            <AttributeTable title="highest rated directors" data={[...directors].sort((a,b) => (b.avgRating??0)-(a.avgRating??0)).slice(0,10)} metric="rating" />
          </div>
        </section>

        <section>
          <SectionHeader title="cast" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AttributeTable title="most watched actors" data={cast.slice(0, 10)} metric="count" />
            <AttributeTable title="highest rated actors" data={[...cast].sort((a,b) => (b.avgRating??0)-(a.avgRating??0)).slice(0,10)} metric="rating" />
          </div>
        </section>

        {/* Rewatches */}
        <section>
          <SectionHeader title="rewatches" />
          <RewatchList data={rewatched} />
        </section>

      </div>
    </div>
  )
}