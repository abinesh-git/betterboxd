import { useNavigate } from 'react-router-dom'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: 'Clash Display, sans-serif',
          fontWeight: 600,
          fontSize: 16,
          color: 'var(--text-primary)',
          marginBottom: 12,
          marginTop: 0,
        }}
      >
        {title}
      </h2>
      <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 10px' }}>{children}</p>
}

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            fontSize: 13,
            cursor: 'pointer',
            padding: 0,
            marginBottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          ← back
        </button>

        {/* Header */}
        <h1
          style={{
            fontFamily: 'Clash Display, sans-serif',
            fontWeight: 600,
            fontSize: 28,
            color: 'var(--text-primary)',
            marginBottom: 8,
            marginTop: 0,
          }}
        >
          Privacy
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 48 }}>
          Plain English. No legalese.
        </p>

        <Section title="Where your data lives">
          <P>
            Everything Cinestamp stores lives in your browser — specifically in IndexedDB, a local
            database built into every modern browser. Your film history, ratings, diary entries,
            watchlist, and any stats we compute from them never leave your device.
          </P>
          <P>
            We have no servers that receive your personal data. There is no account, no login,
            and no sync. If you clear your browser data, your Cinestamp data is gone too — so
            hold on to your Letterboxd export ZIP.
          </P>
        </Section>

        <Section title="What we send to TMDB">
          <P>
            When you upload your export, Cinestamp fetches film metadata (posters, directors,
            genres, runtime etc.) from The Movie Database (TMDB) API. To do this, we send TMDB
            the title and year of each film you've watched. That's it — no personal information,
            no watch dates, no ratings.
          </P>
          <P>
            TMDB has their own privacy policy at themoviedb.org. We use their free API and are
            required to credit them, which we do. Cinestamp is not endorsed or certified by TMDB.
          </P>
        </Section>

        <Section title="Tracking, analytics, cookies">
          <P>
            None. We don't use Google Analytics, Mixpanel, or any third-party analytics tools.
            We don't set cookies. We don't serve ads. We don't track what pages you visit or
            what films you look at.
          </P>
          <P>
            Vercel (our hosting provider) may log basic server request data (IP address,
            timestamp, path) as part of normal web infrastructure. We don't have access to
            individual-level data from those logs.
          </P>
        </Section>

        <Section title="When you create an account (future)">
          <P>
            Accounts don't exist yet — this is phase 2. When we build them, here's how it'll work:
          </P>
          <P>
            If you sign in with Google, we'll receive your email address and name from Google
            OAuth. We'll use your email to identify your account and send you infrequent
            product updates (you can opt out). We won't sell it or share it with anyone.
          </P>
          <P>
            Your film data will move from your browser to our servers (Turso, a hosted SQLite
            database) so you can access it from any device. You'll be able to export everything
            as a JSON file at any time, and delete your account and all associated data
            permanently whenever you want. We'll hold to those promises.
          </P>
        </Section>

        <Section title="The Claude API (AI features)">
          <P>
            Some features — like the taste profile narrative on the Insights page — use the
            Anthropic Claude API. When you trigger one of these, a summary of your stats
            (top genres, directors, rating patterns) is sent to Anthropic's API to generate
            the response. No personal identifiers are included. Anthropic's usage policies
            apply to that data.
          </P>
          <P>
            AI features are optional and clearly labelled. Nothing is sent to Claude without
            you explicitly triggering it.
          </P>
        </Section>

        <Section title="Questions">
          <P>
            If you have questions or concerns, reach out at{' '}
            <a
              href="mailto:abinesh@iitb.ac.in"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              abinesh@iitb.ac.in
            </a>
            . This is a solo project — you'll get a direct reply.
          </P>
        </Section>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 24,
            fontSize: 12,
            color: 'var(--text-dim)',
          }}
        >
          Cinestamp · cinestamp.vercel.app
        </div>
      </div>
    </div>
  )
}
