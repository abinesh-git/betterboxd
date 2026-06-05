import { useNavigate } from 'react-router-dom'
import { BarChart2, Globe, Users, Sparkles } from 'lucide-react'

const FEATURES = [
  {
    icon: BarChart2,
    title: 'Stats that actually go deep',
    desc: 'Genres, decades, languages, countries, runtime patterns. Everything Letterboxd shows you — and then some.',
  },
  {
    icon: Users,
    title: 'Beyond the director',
    desc: 'Cinematographers, composers, screenwriters, editors. See who keeps showing up in the films you love.',
  },
  {
    icon: Globe,
    title: 'Country Passport',
    desc: 'Track every country you\'ve watched cinema from. See the gaps. Fill them intentionally.',
  },
  {
    icon: Sparkles,
    title: 'Annual Wrapped',
    desc: 'A shareable year-in-review card for every year you have data. What defined your taste that year.',
  },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <h1
          className="font-display font-semibold tracking-tight"
          style={{ fontSize: 'clamp(48px, 8vw, 80px)', color: 'var(--text-primary)', lineHeight: 1.05 }}
        >
          Cinestamp
        </h1>
        <p
          className="mt-4 text-lg max-w-sm"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
        >
          understand your taste
        </p>
        <p
          className="mt-2 text-sm max-w-md"
          style={{ color: 'var(--text-dim)' }}
        >
          Upload your Letterboxd export and get deep analytics about your watch history, taste profile, and cinematic identity.
        </p>

        {/* CTAs */}
        <div className="flex items-center gap-3 mt-10 flex-wrap justify-center">
          <button
            onClick={() => navigate('/upload')}
            className="px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#0d0f11',
              borderRadius: 'var(--radius)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Upload your export
          </button>
          <button
            disabled
            className="px-6 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-dim)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              cursor: 'not-allowed',
            }}
          >
            Demo — coming soon
          </button>
        </div>

        <p className="mt-4 text-xs" style={{ color: 'var(--text-dim)' }}>
          Get your export at{' '}
          <a
            href="https://letterboxd.com/data/export/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-[var(--text-secondary)]"
            style={{ color: 'var(--text-dim)' }}
          >
            letterboxd.com/data/export
          </a>
        </p>
      </div>

      {/* Feature highlights */}
      <div
        className="border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="max-w-4xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="p-5"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="mb-3" style={{ color: 'var(--accent)' }}>
                  <Icon size={20} />
                </div>
                <h3
                  className="font-display font-semibold mb-1.5"
                  style={{ fontSize: 15, color: 'var(--text-primary)' }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {f.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer note */}
      <div
        className="text-center py-6 text-xs border-t"
        style={{ color: 'var(--text-dim)', borderColor: 'var(--border)' }}
      >
        Your data stays in your browser. No account required. Film data from TMDB.
      </div>
    </div>
  )
}
