import { useEffect, useState } from 'react'
import { db } from './db'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import { useAppStore } from './store'

export default function App() {
  const [hasData, setHasData] = useState<boolean | null>(null)
  const setProfile = useAppStore((s) => s.setProfile)
  const setTotalFilms = useAppStore((s) => s.setTotalFilms)

  useEffect(() => {
    async function check() {
      const count = await db.films.count()
      const profiles = await db.profile.toArray()
      if (count > 0 && profiles.length > 0) {
        setProfile(profiles[0])
        setTotalFilms(count)
        setHasData(true)
      } else {
        setHasData(false)
      }
    }
    check()
  }, [])

  if (hasData === null) return (
    <div className="min-h-screen bg-[#14181c] flex items-center justify-center">
      <div className="text-[#99aabb] text-sm">loading...</div>
    </div>
  )

  return hasData ? <DashboardPage /> : <UploadPage />
}