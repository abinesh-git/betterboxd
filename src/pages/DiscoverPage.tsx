import { Construction } from 'lucide-react'

export default function DiscoverPage() {
  return (
    <div className="p-6 md:p-8">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded mb-6 text-sm"
        style={{
          backgroundColor: 'var(--accent-dim)',
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
          borderRadius: 'var(--radius-sm)',
          display: 'inline-flex',
        }}
      >
        <Construction size={14} />
        <span>Work in progress</span>
      </div>
      <h1 className="font-display font-semibold mb-2" style={{ fontSize: 22, color: 'var(--text-primary)' }}>
        Discover
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
        Blind spots from your top directors, unexplored countries and languages, highly-rated unseen films in genres you love.
        Recommendations based on taste profiles coming in phase 2.
      </p>
    </div>
  )
}
