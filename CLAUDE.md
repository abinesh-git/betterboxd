# Cinestamp — Full Project Context for Claude Code

This document is the single source of truth for the Cinestamp project. Read it entirely before touching any code. Every decision here was made deliberately — do not deviate without good reason.

---

## What is Cinestamp?

Cinestamp is a Letterboxd stats and taste intelligence dashboard. It takes a user's Letterboxd data export (ZIP file) and transforms it into deep, meaningful analytics about their film watching habits, taste profile, and cinematic identity.

It is NOT a Letterboxd clone. It is NOT a social network. It is an analytics and intelligence layer built on top of Letterboxd data.

**Tagline direction:** "understand your taste" — not "better stats"

**Target user:** Heavy Letterboxd users — diary keepers, cinephiles, people who care deeply about their watch history and want more than Letterboxd's basic stats page offers.

**What makes it different:**
- Depth of stats Letterboxd will never build (it's not their core product)
- Taste intelligence — not just what you watched but what it says about you
- Crew stats beyond director (cinematographers, composers, writers)
- Tag-based analytics (user-defined dimensions)
- Country Passport collectable feature
- Cross-period comparison
- Annual Wrapped shareable card
- Future: multi-platform (Serializd for TV, StoryGraph for books)

---

## Project Name & Branding

**Product name:** Cinestamp
**Current domain:** cinestamp.vercel.app
**Future domain:** cinestamp.app (buy when ready to go public)
**GitHub repo:** github.com/abinesh-git/cinestamp
**Builder:** Abinesh (solo, IIT Bombay MSE student)

### Brand personality
- Professional but not corporate
- Cinephile-native — uses film vocabulary naturally
- Minimal and confident — doesn't over-explain
- NOT vibe-coded, NOT AI-sounding, NOT generic SaaS
- Think: a tool built by a film lover for film lovers

### DO NOT
- Sound like a Letterboxd copy
- Use generic SaaS language ("powerful", "seamless", "robust")
- Over-explain features
- Use emojis in UI
- Make it look like Spotify (avoid circle-heavy iconography)

---

## Design System

### Theme architecture
All colors MUST be CSS variables. Never hardcode colors in components. This is because future themes (Oppenheimer, Barbie, Avengers, Batman etc) will be implemented by swapping one attribute on `<html>`. Every theme customises everything — background, surface, accent, typography weight, even border radius.

```css
:root[data-theme="cinematic"] {
  --bg: #0d0f11;
  --surface: #161b22;
  --surface-raised: #1e242d;
  --border: #2a3140;
  --text-primary: #f0f2f5;
  --text-secondary: #8892a0;
  --text-dim: #4a5568;
  --accent: #f5a623;
  --accent-dim: rgba(245, 166, 35, 0.12);
  --success: #00c896;
  --danger: #e05252;
  --radius: 10px;
  --radius-sm: 6px;
  --radius-lg: 16px;
}

/* Future themes follow same variable names, different values */
:root[data-theme="oppenheimer"] {
  --bg: #1a0a00;
  --surface: #2d1500;
  --accent: #ff6b00;
  /* etc */
}
```

### Current theme: Cinematic Dark
- Deep warm blacks, not flat grey (different from Letterboxd)
- Amber accent (`#f5a623`) — projector light, cinematic, original, not used by competitors
- Teal-green for success (`#00c896`) — NOT Letterboxd green
- Feels like sitting in a darkened theatre

### Typography
- **Headings:** Clash Display (500, 600, 700) — from Fontshare, free, has personality
- **Body/UI:** Inter (400, 500, 600) — clean, readable at small sizes
- **Numbers/stats:** JetBrains Mono (400, 500) — data-forward moments, adds character

Load in index.html:
```html
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Layout
- **Landing:** No sidebar. Full viewport, centered, minimal.
- **App (post-upload):** Left sidebar on desktop. Bottom navigation on mobile.
- **Sidebar:** 56px icons-only by default, expands to 220px on hover. Collapsible.
- **Content:** Generous padding, breathes. Not cramped.
- **Cards:** `var(--surface)` background, `var(--border)` border, `var(--radius)` corners.

### Component principles
- Minimal animation — subtle, purposeful, not decorative
- Every stat has a label in `var(--text-dim)`, value in `var(--text-primary)`
- Numbers use JetBrains Mono
- Charts use `var(--accent)` as primary color with opacity variants
- Loading states: skeleton screens, not spinners
- Empty states: always show something useful ("no diary entries yet — start logging on Letterboxd")

---

## Tech Stack

```
Frontend:     Vite + React + TypeScript
Styling:      Tailwind CSS (with @tailwindcss/vite plugin)
State:        Zustand (UI/app state)
DB (local):   Dexie.js (IndexedDB wrapper)
Data fetch:   TanStack Query (TMDB API calls)
Charts:       Recharts (bar, line, area charts)
Maps:         D3 (d3-geo, d3-selection, d3-zoom, topojson-client)
ZIP parse:    JSZip
CSV parse:    PapaParse
Routing:      React Router v6
Icons:        Lucide React
```

### Phase 2 additions (cloud)
```
Auth:         Clerk (free up to 10k MAU)
Database:     Turso (SQLite, 9GB free tier)
API/proxy:    Cloudflare Workers (RSS proxy, API layer)
Email:        Resend (3k emails/month free)
Hosting:      Vercel (current, stays)
```

### Environment variables
```
VITE_TMDB_READ_TOKEN=    # Bearer token for TMDB API
VITE_TMDB_API_KEY=       # TMDB API key (backup)
```

Note: TMDB free API is technically non-commercial. Email TMDB before monetising. They are generally reasonable with indie developers.

---

## Data Sources

### 1. Letterboxd ZIP Export (primary)
User exports from: **https://letterboxd.com/data/export/** (direct link — always show this in upload UI, saves users hunting through settings)

ZIP contains:
- `watched.csv` — all films marked watched (Date, Name, Year, Letterboxd URI) — 2315 films in test data
- `diary.csv` — logged watches with dates (Date, Name, Year, Letterboxd URI, Rating, Rewatch, Tags, Watched Date) — 747 entries in test data
- `ratings.csv` — all rated films (Date, Name, Year, Letterboxd URI, Rating) — 1047 entries
- `watchlist.csv` — watchlist films
- `reviews.csv` — written reviews
- `profile.csv` — username, name, bio, joined date, favourite films
- `likes/films.csv` — liked films
- `comments.csv` — comments

**CRITICAL deduplication issue discovered in development:**
watched.csv and diary.csv use DIFFERENT short URL formats for the same film. Zero URI overlap. Deduplication MUST be done by `Name + Year` not by URI. watched.csv is the canonical source (2315 films). diary.csv entries are merged into watched.csv entries by Name+Year match. This was a major bug that caused 3062 films instead of 2315.

**Ratings also have URI mismatch:** ratings.csv URIs don't match watched.csv URIs for the same films. Always build a name+year fallback lookup for ratings.

### 2. RSS Feed (delta sync)
URL: `letterboxd.com/{username}/rss/`
- Public, no auth needed
- Contains last ~50 diary entries only
- Has: watchedDate, memberRating, filmTitle, filmYear, tmdb:movieId (useful — direct TMDB ID)
- Does NOT have: films marked watched without logging, watchlist changes, ratings without diary entry
- CORS blocked in browser — needs a Cloudflare Worker proxy (phase 2)
- Always show disclaimer: "RSS sync updates diary logs only. Films marked as watched without logging won't appear until you re-upload your export."

### 3. TMDB API
Base URL: `https://api.themoviedb.org/3`
Auth: Bearer token in Authorization header

Key endpoints:
- Search: `/search/movie?query={title}&year={year}`
- Details: `/movie/{id}?append_to_response=credits,keywords,release_dates`

Rate limit: 40 requests per 10 seconds. Use batch size of 35 with 10.5s delay between batches.

**Store EVERYTHING TMDB returns.** Never be selective. Future features will need data you didn't anticipate. The tmdbData object must be comprehensive (see Data Model section).

Fallback for not-found films: fetch Letterboxd film page, scrape TMDB link from footer. Requires proxy (phase 2). ~5% of films not found via search.

### 4. Curated Lists (JSON files in repo)
Static lists matched by imdbId (exact) or title+year (fuzzy fallback):
- IMDB Top 250
- Oscar Best Picture winners
- Cannes Palme d'Or winners
- Letterboxd Top 250 (snapshot, flag with "last updated" date)

Add more lists progressively. Architecture doesn't change — just add a new JSON file.

TMDB collections (MCU, DCU, franchises, trilogies) — automatic via API, no manual curation.

---

## Data Model

### Film (primary table, keyed by uri)

```typescript
interface Film {
  // Identity
  uri: string                      // Letterboxd URI (primary key)
  title: string
  originalTitle: string
  year: number

  // From watched.csv
  dateAdded: string                // when appeared in watched.csv

  // From ratings.csv (canonical rating — may differ from diary rating)
  rating?: number                  // 0.5–5.0
  ratingDate?: string

  // From diary.csv (merged by Name+Year)
  diaryEntries: DiaryEntry[]

  // From watchlist.csv
  onWatchlist: boolean
  watchlistDate?: string

  // Computed at parse time
  releaseToWatchGapDays?: number   // days between tmdb release date and first watch
  
  // TMDB enrichment
  enriched: boolean
  enrichError?: boolean
  tmdbId?: number
  tmdbData?: TMDBData
}

interface DiaryEntry {
  watchedDate: string
  loggedDate: string
  rating?: number                  // diary-specific rating (may differ from canonical)
  rewatch: boolean
  tags: string[]                   // user-defined tags — FIRST CLASS FEATURE
  // Computed
  dayOfWeek?: number               // 0-6 (0=Sunday)
  month?: number                   // 1-12
}

interface TMDBData {
  tmdbId: number
  
  // Basic
  originalTitle: string
  tagline?: string
  overview?: string
  status: string                   // Released, Post Production, etc
  tmdbReleaseDate: string          // needed for releaseToWatchGapDays
  runtime?: number
  budget?: number
  revenue?: number
  popularity: number
  voteCount: number
  tmdbRating?: number              // vote_average (out of 10)
  imdbId?: string                  // CRITICAL for list matching
  
  // Media
  posterPath?: string
  backdropPath?: string
  
  // Classification
  genres: string[]
  keywords: string[]               // e.g. "slow cinema", "nouvelle vague", "based on novel"
  originalLanguage: string         // ISO 639-1 code
  spokenLanguages: string[]        // English names
  productionCountries: string[]    // Full country names
  isAdaptation: boolean            // derived from keywords
  
  // Companies
  productionCompanies: {
    id: number
    name: string
    originCountry: string
  }[]
  
  // Collection/franchise
  collection?: {
    id: number
    name: string
  }
  
  // Crew (all from credits endpoint)
  directors: string[]
  cinematographers: string[]       // job === "Director of Photography"
  composers: string[]              // job === "Original Music Composer"  
  screenwriters: string[]          // job === "Screenplay" or "Story" or "Writer"
  editors: string[]                // job === "Editor"
  cast: string[]                   // top 10 billed actors
  
  fetchedAt: string
}
```

### UserProfile (keyed by username)
```typescript
interface UserProfile {
  username: string                 // Letterboxd username
  givenName: string
  familyName: string
  location: string
  dateJoined: string
  favoriteFilmUris: string[]
}
```

### CachedStats (single row, precomputed)
```typescript
interface CachedStats {
  id: 'main'
  computedAt: string
  totalFilms: number
  totalRated: number
  totalHours: number
  totalDays: number
  uniqueCountries: number
  uniqueLanguages: number
  uniqueDirectors: number
  avgRating: number
  longestStreak: number
  currentStreak: number
  // Add more as needed
}
```

### RSSCursor (single row)
```typescript
interface RSSCursor {
  id: 'main'
  username: string
  lastFetch: string
  lastEntryDate: string
}
```

---

## Application Architecture

### Phase 1 (current — local-first)
```
Browser only. No backend. No accounts.
User data lives in IndexedDB (Dexie.js).
TMDB calls made directly from browser.
RSS blocked by CORS — not yet implemented.
```

### Phase 2 (cloud)
```
Turso (SQLite) for persistent storage
Clerk for authentication (Google OAuth + email)
Cloudflare Workers for:
  - RSS proxy (fetches letterboxd.com RSS, returns XML)
  - API layer
Resend for email (monthly digests, milestones)
```

### Account creation flow (phase 2)
Do NOT ask for account upfront. Flow:
1. User uploads ZIP → enrichment → dashboard loads
2. After ~60 seconds on dashboard, subtle banner: "Save your stats — create account"
3. Google OAuth (primary) or email/password
4. Username auto-filled from profile.csv Letterboxd username
5. Cross-validate: ZIP filename is `letterboxd-{username}-{date}.zip` — check filename matches profile.csv username
6. Data syncs to Turso

Username verification (future): generate a code, user adds to Letterboxd bio, verify via RSS feed (bio sometimes included) or proxy fetch.

### Smart re-import
Never re-enrich already-enriched films. On ZIP upload:
1. Parse CSVs
2. Compare against existing DB by title+year key
3. Already in DB → update rating, diary entries, watchlist only (preserve tmdbData)
4. New films only → run TMDB enrichment
5. Show "X new films found, enriching..."

---

## File Structure

```
cinestamp/
├── public/
│   └── favicon.svg              # Amber bar chart favicon
├── src/
│   ├── types/
│   │   └── index.ts             # All TypeScript interfaces
│   ├── db/
│   │   └── index.ts             # Dexie schema + helpers
│   ├── lib/
│   │   ├── parser.ts            # ZIP → CSV → Film[] (with dedup fix)
│   │   ├── tmdb.ts              # TMDB enrichment pipeline
│   │   ├── stats.ts             # All stat computation functions
│   │   ├── rss.ts               # RSS fetch + parse (phase 2, CORS proxy needed)
│   │   └── lists/
│   │       ├── imdb-top-250.json
│   │       ├── oscar-best-picture.json
│   │       ├── cannes-palme-dor.json
│   │       └── letterboxd-top-250.json
│   ├── store/
│   │   └── index.ts             # Zustand store
│   ├── hooks/
│   │   ├── useStats.ts          # Stats computation hooks
│   │   └── useFilms.ts          # Film query hooks
│   ├── components/
│   │   ├── ui/                  # Primitives: StatCard, SectionHeader, Badge etc
│   │   ├── charts/              # Recharts wrappers
│   │   ├── map/                 # D3 world map + country passport
│   │   ├── layout/              # Sidebar, TopBar, MobileNav
│   │   └── upload/              # Upload flow components
│   └── pages/
│       ├── LandingPage.tsx
│       ├── OverviewPage.tsx
│       ├── FilmsPage.tsx
│       ├── StatsPage.tsx
│       ├── JourneyPage.tsx
│       ├── CrewPage.tsx
│       ├── MapPage.tsx
│       ├── ListsPage.tsx
│       ├── ComparePage.tsx
│       ├── TagsPage.tsx
│       ├── WatchlistPage.tsx
│       ├── InsightsPage.tsx
│       ├── DiscoverPage.tsx     # "Work in progress" banner, still useful
│       └── WrappedPage.tsx
├── CLAUDE.md                    # This file
├── .env                         # Never commit
└── .gitignore                   # Must include .env
```

---

## Pages — Full Specification

### `/` — Landing
- Full viewport, dark, no sidebar
- Centered: "Cinestamp" in Clash Display + one-line tagline
- Two CTAs: "Upload your export" + "Explore demo"
- Below fold: actual product screenshots (not mockups)
- 3-4 feature highlights with real UI snippets
- No footer clutter
- Upload CTA links directly to export: https://letterboxd.com/data/export/
- Demo mode uses anonymised version of real data (Abinesh's export, username replaced with "cinephile_demo")

### `/overview` — Dashboard
- Greeting: "Good evening, @username"
- Hero stat row (JetBrains Mono numbers):
  - Films watched
  - Hours (days if > 365 hours)
  - Countries
  - Avg rating
  - Current streak
- Recent diary entries (last 5, with poster thumbnails)
- Rating distribution chart
- Quick highlights: top director, top genre, most rewatched film
- Everything meaningful above fold on desktop

### `/films` — Film Library
- Grid view (poster) default, list view toggle
- Filters (all combinable):
  - Type: Feature / Short / Miniseries
  - Genre (multi-select)
  - Release year range (slider)
  - Language
  - Country
  - Your rating (range)
  - Rewatch: yes/no
  - Tag (from diary tags)
  - Runtime bucket: <90min, 90-120, 120-150, 150+
  - Watched year
- Sort: date watched, release year, your rating, TMDB rating, runtime, title, surprise me
- Search: title search
- Each card: poster, title, year, your rating (stars), rewatch badge if applicable
- Click film → film detail modal (your rating, diary entries, TMDB data, crew)

### `/stats` — Taste Breakdown
Tab navigation: **Genre · Language · Country · Decade · Runtime · Production**

Each tab shows:
- Most watched (bar chart, top 10)
- Highest rated (ranked list with avg rating, min 3 films)
- Insight callout: e.g. "You rate Thriller films 0.4★ above your average"

Specific tab additions:
- **Language:** count of unique languages, "n languages" stat
- **Country:** links to Map page
- **Decade:** timeline showing taste evolution
- **Production:** production companies, budget tier breakdown (indie vs studio vs blockbuster)

### `/journey` — Watch History
- GitHub-style contribution heatmap (diary logs by day)
- Films per year bar chart
- Cumulative films over time line chart (shows trajectory)
- Streaks panel: current day streak, longest day streak, current week streak, longest week streak
- Binge sessions: days with 3+ films logged
- Day of week breakdown: which day you watch most
- Month breakdown: seasonal patterns
- Time of year heatmap (month x year grid)
- "First film ever logged" callout
- Most prolific watching month ever

### `/crew` — People
Tab navigation: **Directors · Cast · Cinematographers · Composers · Writers · Editors**

Each tab:
- Ranked list: name, films watched count, avg your rating, progress bar
- Click → drawer/modal: all films you've seen with them, your avg rating, films you HAVEN'T seen (blind spot callout)
- Top 25 shown, load more option

Director tab extras:
- "Directors you've seen 5+ films from" highlighted section
- Director loyalty score concept

### `/map` — World Map
- Full-width D3 SVG map
- Zoom (scroll) + reset zoom button
- Hover: country name + film count (even for zero-count countries)
- Click country → side panel: list of films from that country with poster, title, year, your rating
- Color scale: amber gradient, intensity = sqrt(count/max)
- **Country Passport section below map:**
  - Grid of country flags
  - Watched countries: full color, flag visible, film count badge
  - Unwatched countries: greyed out, blurred flag
  - Total: "X / 195 countries"
  - Sort: by count, by region, alphabetical
- Stats bar above map: X countries · most watched country · films from unseen countries on watchlist

### `/lists` — Lists & Collections

**Awards tab:**
- Oscar Best Picture — progress bar + film grid (seen/unseen)
- Cannes Palme d'Or — same
- More awards added progressively

**Collections tab:**
- TMDB franchise collections (MCU, DCU, LOTR, etc)
- Auto-detected from enriched film data
- Completion ring (donut chart) per collection
- Films seen / total films in collection
- Missing films listed

**Top Lists tab:**
- IMDB Top 250 — matched by imdbId (exact)
- Letterboxd Top 250 — matched by imdbId or title+year, flagged "snapshot as of [date]"
- Progress bar + which ones you haven't seen
- Sort unseen by TMDB rating (what to watch next)

### `/compare` — Period Comparison
- Period selector: Year vs Year / Custom range / Past 7 days / Past 30 days / Past 90 days / All time
- Side-by-side panels showing for each period:
  - Films count
  - Hours watched
  - Avg rating
  - Top genre
  - Top director
  - Top language
  - Most watched day of week
- Delta indicators: ↑↓ arrows with % change
- Charts: overlaid bar charts for direct comparison

### `/tags` — Tag Analytics
- All user tags as cards (count badge)
- Click tag → full stats breakdown:
  - Films with this tag (filterable grid)
  - Genre breakdown for this tag
  - Year distribution
  - Rating distribution
  - Top directors for this tag
  - Avg rating for this tag vs overall avg
- "Theatre effect": if user has a "theatre" tag, show "you rate theatre watches X★ higher on average"
- Tag comparison: select two tags, compare stats

### `/watchlist` — Watchlist
- Total watchlist size
- Oldest film on watchlist (unwatched)
- Average time on watchlist before watching (for films that were on watchlist then watched)
- Genre breakdown of watchlist vs watched (what you intend to watch vs what you actually watch — gap is revealing)
- Directors on watchlist you haven't explored yet
- % of watchlist you've actually watched (completion funnel)
- Watchlist films sorted by: date added, TMDB rating, release year

### `/insights` — Taste Intelligence
Free tier (always visible):
- 3 insight cards surfaced dynamically (most interesting/extreme patterns)
- Each card: insight statement + the data behind it + small supporting chart
- Example insights:
  - "You rate films from directors you've seen 3+ times 0.6★ higher on average"
  - "Your comfort zone score is 34% — you mostly revisit familiar genres"
  - "You watched 40% more films in winter than summer"
  - "Films on your watchlist for 2+ years have a TMDB rating of 8.2 — your taste is good, you just need to pull the trigger"

Gated (donate/paid):
- Blurred cards with amber lock icon
- "Unlock with a donation" CTA
- Full insight suite:
  - Taste drift analysis (how genre/language/country distribution shifted year over year)
  - Blind spot engine (highly acclaimed films in your taste profile you haven't seen)
  - Comfort zone score (% watches in already-familiar territory)
  - Rating personality type (contrarian / validator / champion / explorer)
  - "You tend to rate X higher when Y" pattern insights (rule-based)
  - Director loyalty scores
  - Hidden gems (films you rated significantly higher than TMDB)
  - Release-to-watch gap analysis (are you an early adopter or late watcher)
  - Taste profile narrative — generated via Claude API (one free generation per week for free users, unlimited for donors)

### `/discover` — Discovery (Work in Progress)
- Prominent "Work in Progress" banner — honest, not hidden
- Still functional with what's buildable now:
  - Blind spots: unseen films from your top 10 directors (sorted by TMDB rating)
  - "You haven't explored": countries with zero watches, languages with zero watches
  - Highly rated unseen films in genres you love
  - Films sitting on your watchlist longest
- Phase 2: recommendations based on similar user taste profiles

### `/wrapped` — Annual Wrapped
- Year selector (all years you have data for)
- Animated reveal sequence (like Spotify Wrapped but for film)
- Stats revealed:
  - Total films that year
  - Total hours
  - Top film (your highest rated)
  - Top director
  - Top genre
  - Most watched month
  - Most rewatched film
  - New countries discovered
  - A generated sentence about the year's taste
- Shareable as image (html2canvas or similar)
- Cinematic design — this is the viral/shareable moment, make it beautiful

---

## Key Features Detail

### Smart Re-import
On ZIP upload, compare incoming films against existing DB by `title.trim() + '|||' + year`. 
- Match found → update rating, diaryEntries, onWatchlist only. Preserve tmdbData entirely.
- No match → new film, enrich via TMDB.
- Show "X new films, Y updated" summary.
- Enrichment runs only for new films — takes seconds not minutes for subsequent imports.

### TMDB Enrichment Pipeline
```
For each film (batches of 35, 10.5s delay between batches):
  1. Search: /search/movie?query={title}&year={year}
  2. If no results: retry without year
  3. Pick highest popularity result
  4. Fetch: /movie/{id}?append_to_response=credits,keywords,release_dates
  5. Extract ALL fields (see TMDBData interface)
  6. Store in DB
  7. Mark enriched: true
  8. On error: mark enrichError: true, still mark enriched: true (don't retry forever)

Show progress bar during enrichment. Not-found films (~5%) are expected — don't alarm user.
```

### Language Display
ISO 639-1 codes must be converted to full language names. A comprehensive mapping exists in `src/lib/stats.ts`. If a code is missing, add it — never show raw codes in UI.

### Country Passport
- Grid of country flags (use a flag emoji library or SVG flags)
- Watched = full opacity, unlocked
- Unwatched = 20% opacity, greyed
- Hover: country name + "X films watched" or "not yet watched"
- Milestone callouts: "You've visited 50 countries!" 
- Located in /map page, below the world map

### Filters (everywhere)
Film type filter (Feature / Short / Miniseries) must be available on every page that shows films. TMDB returns runtime — use this heuristic:
- Short: runtime < 40 minutes
- Miniseries: TMDB type === "tv" (Letterboxd includes some TV)
- Feature: everything else

### Tags (first-class feature)
Tags in diary.csv are comma-separated. Parse and trim each. Tags are user-defined — some users tag "theatre", "rewatch", "criterion", "with mum" etc. These are deeply personal dimensions.

Stats per tag must mirror the main stats pages: genre breakdown, year distribution, rating analysis, director breakdown — all filtered to that tag.

### Streaks
Computed from diary.csv watchedDate:
- Day streak: consecutive calendar days with at least one diary entry
- Week streak: consecutive calendar weeks (Mon-Sun) with at least one diary entry
- Compute both current and all-time longest

---

## Business Model

### Free tier
- All pages and features listed above
- 3 dynamic insight cards on /insights
- One Wrapped card per year
- One taste profile generation per week (Claude API)

### Paid tier (donate model initially)
- Donate button, no mandatory subscription for now
- Unlocks: full insight suite on /insights, unlimited taste profile generation, future: themes
- Do NOT build subscription infrastructure yet — Stripe, webhooks etc. Start with simple donation (Ko-fi or Buy Me a Coffee link)
- Future: proper subscription if traction justifies it

### TMDB license
TMDB free API is non-commercial. Before adding any payment/donation, email TMDB explaining the project. They often grant exceptions for indie projects. Do not ignore this.

### Future revenue directions
- Themed dashboard skins (Oppenheimer, Barbie, Avengers, Batman, etc) — purchasable
- Premium intelligence features
- B2B API access (taste profiles) — very long term
- Multi-platform expansion (Serializd TV, StoryGraph books) — expands TAM significantly

---

## What NOT to Build Yet

- User accounts (phase 2)
- RSS sync (needs CORS proxy — phase 2)
- Social features (phase 2)
- Multi-platform support (phase 3)
- Mobile native app (after web is solid)
- Recommendation algorithm (placeholder page is fine)
- Review sentiment analysis (store reviews now, analyse later)
- Email notifications (needs accounts)
- API endpoints for third parties

---

## Current State (what's already built)

- ZIP parser with Name+Year deduplication fix ✅
- TMDB enrichment pipeline with rate limiting ✅
- Dexie IndexedDB schema ✅
- Zustand store ✅
- Basic stats functions (genres, languages, countries, directors, cast, decades, ratings) ✅
- Upload page with progress bar ✅
- Basic dashboard page (functional but needs complete redesign) ✅
- World map with D3, zoom, hover ✅
- Country passport (flags grid — partial) ✅
- Smart re-import (preserve enriched data) ✅
- Re-import button (clears DB, reloads) ✅
- Language ISO → full name mapping ✅
- Favicon (amber bar chart SVG) ✅
- Deployed on Vercel ✅

## What needs to be built / fixed

- Complete UI redesign (apply design system above — CSS variables, Clash Display, amber accent)
- React Router setup (all pages above)
- Landing page
- All individual pages (see Pages specification above)
- Sidebar navigation component
- Mobile bottom navigation
- Film detail modal
- Country side panel (click country → films from that country)
- Lists page with JSON data files
- Tags page
- Compare page
- Insights page (free cards + gated cards)
- Discover page (work in progress)
- Wrapped page
- Demo mode (anonymised data, no upload required)
- Precomputed stats cache (CachedStats table in Dexie)
- Streaks computation
- Film type classification (feature/short/miniseries)
- Crew page (cinematographers, composers etc — needs TMDBData update)
- Extended TMDB fields (cinematographers, composers, writers, editors, keywords, imdbId, budget, revenue — currently not being fetched)
- IMDB list JSON files
- Oscar/Cannes JSON files
- Privacy policy page (plain English, not legal boilerplate)
- TMDB attribution (required by their terms)

---

## Critical Rules for Development

1. **CSS variables only** — never hardcode colors. Every color goes through `var(--x)`.
2. **TypeScript strict** — no `any` unless absolutely unavoidable, comment why.
3. **Mobile first** — every component must work on 375px width.
4. **No re-enrichment** — never wipe and re-enrich existing data. Smart re-import only.
5. **Error states** — every async operation needs loading, error, and empty states.
6. **Performance** — 3000+ films in DB. Compute stats once, cache in CachedStats. Don't recompute on every render.
7. **Film type filter** — must be present everywhere films are shown.
8. **Don't sound AI** — all UI copy must sound like a human film lover wrote it. No "powerful analytics", no "seamless experience".
9. **No emojis in UI** — except flag emojis in Country Passport, which are intentional.
10. **Abinesh reviews everything** — don't make opinionated UX decisions without flagging them. Build, then ask.

---

## Tone & Copy Guidelines

Good: "you've seen 2,315 films" 
Bad: "Your viewing history contains 2,315 entries"

Good: "directors you keep coming back to"
Bad: "Most frequently watched directors"

Good: "films sitting on your watchlist"
Bad: "Watchlist items pending viewing"

Good: "not yet explored"
Bad: "Unwatched content"

Write like a smart film friend, not a SaaS dashboard.

---

## Contact / Context

Builder: Abinesh (abinesh-git on GitHub)
This is a solo project built alongside academics at IIT Bombay.
Communication style: direct, terse, no filler. Flag issues immediately. Test before proceeding.
Preferred workflow: build one thing fully, confirm it works, move to next.
