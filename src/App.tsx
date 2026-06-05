import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { db } from './db'
import { useAppStore } from './store'

import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import OverviewPage from './pages/OverviewPage'
import FilmsPage from './pages/FilmsPage'
import StatsPage from './pages/StatsPage'
import JourneyPage from './pages/JourneyPage'
import CrewPage from './pages/CrewPage'
import MapPage from './pages/MapPage'
import ListsPage from './pages/ListsPage'
import ComparePage from './pages/ComparePage'
import TagsPage from './pages/TagsPage'
import WatchlistPage from './pages/WatchlistPage'
import InsightsPage from './pages/InsightsPage'
import DiscoverPage from './pages/DiscoverPage'
import WrappedPage from './pages/WrappedPage'
import PrivacyPage from './pages/PrivacyPage'
import BreakdownPage from './pages/BreakdownPage'

function RootRoute() {
  const { profile } = useAppStore()
  if (profile) return <Navigate to="/overview" replace />
  return <LandingPage />
}

function RequireData() {
  const { profile } = useAppStore()
  if (!profile) return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  const [loading, setLoading] = useState(true)
  const { setProfile, setTotalFilms } = useAppStore()

  useEffect(() => {
    async function check() {
      const [count, profiles] = await Promise.all([
        db.films.count(),
        db.profile.toArray(),
      ])
      if (count > 0 && profiles.length > 0) {
        setProfile(profiles[0])
        setTotalFilms(count)
      }
      setLoading(false)
    }
    check()
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
      }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
          loading...
        </span>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route element={<RequireData />}>
          <Route element={<AppLayout />}>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/films" element={<FilmsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/journey" element={<JourneyPage />} />
            <Route path="/crew" element={<CrewPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/lists" element={<ListsPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/wrapped" element={<WrappedPage />} />
            <Route path="/breakdown" element={<BreakdownPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
