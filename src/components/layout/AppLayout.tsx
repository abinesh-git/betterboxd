import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function AppLayout() {
  return (
    <div className="flex" style={{ height: '100%', backgroundColor: 'var(--bg)' }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 56 }}
      >
        {/* paddingBottom on mobile for the fixed bottom nav */}
        <div className="md:pb-0">
          <Outlet />
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
