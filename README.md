# BharatSpace

India's real-time social network — a fully interactive frontend MVP, plus a
reference backend you can plug in when you're ready to go live.

The web app lives at this repo's root (moved out of a nested `web/`
folder). Layout:

```
./                       ← repo root: the web app itself (React + Vite + Tailwind). Runs standalone.
├── backend/             ← Cloudflare Workers + Supabase API (sibling, not nested)
├── android/             ← Capacitor native Android wrapper around this app's build
├── docs/                ← setup, security, and Play Store docs covering all three
└── .github/workflows/   ← builds a real Android APK on GitHub's runners
```

## Quick start (frontend only — no setup needed)

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`). That's it —
**no backend, database, or account is required.** Sign up with any name/email/
password (nothing is verified or stored anywhere) and the whole app is
immediately usable: post, like, comment, follow, filter feeds, edit your
profile, everything.

## What's here

A 480px mobile-first app shell (also responsive up to desktop) covering:

- **Landing → Sign up / Sign in → Interest onboarding** — a real flow with
  client-side validation, but no actual account is created. This is
  intentional: it's a formality so the rest of the app feels real to use.
- **Home** — For You / Trending / India News / Tech / Culture tabs, story
  highlights, a live feed you can like, comment on, and repost.
- **Discover** — hero banner, trending topics, live broadcasts.
- **Create Post** — text, photo upload (rendered client-side), polls, topic
  tagging — posts you publish appear at the top of your feed immediately.
- **Activity** — filterable notifications (Mentions/Reactions/Comments),
  inline follow-back.
- **Profile / Edit Profile** — stats, topic filters on your own posts, share
  sheet (native share on supporting devices).
- **Reels** — vertical short-form feed (For You / Following / Explore),
  reachable from the Home top bar.
- **Communities** — browse and join topic-based communities, reachable
  from Discover.
- **Messages** — searchable conversation list, reachable from the Home top
  bar (sending is not wired yet — see
  [`../docs/PRODUCT_DIRECTION_UPDATE.md`](../docs/PRODUCT_DIRECTION_UPDATE.md)).

All of it is powered by `src/context/AppContext.jsx`, an in-memory store —
refreshing the page resets state, which is expected for a frontend-only demo.

## Going live with the backend

`../backend/` is a working Cloudflare Workers + Supabase implementation of
the `/v1/...` API, and `src/context/AppContext.jsx` is wired to call it —
see [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the two sides connect.

**`npm run dev` stays in mock mode** — Vite only loads `.env.production`
for `vite build`, not `vite dev`, so the local dev server behaves exactly
as described above regardless of what's baked into a production build.

**`npm run build` is already live** — `.env.production` in this folder
bakes in `VITE_API_BASE_URL=https://new-social-2027.imrankhan210r.workers.dev/v1`,
so every production build (this app deployed to Vercel, and the Android
app in `../android`, which bundles this same build) talks to that backend
by default. To point at a different backend, edit `.env.production` (or
copy `.env.example` → `.env.local` to override just your own local
builds without changing what's committed).

If that backend infrastructure (Supabase project, R2 bucket, Worker with
its secrets) is already set up, start at
[`../docs/CONNECT_EXISTING_INFRA.md`](../docs/CONNECT_EXISTING_INFRA.md) —
a checklist to verify each piece is configured correctly rather than a
from-scratch setup guide. Deploying from nothing is `../backend/README.md`.

Before real traffic, also read [`../docs/SECURITY.md`](../docs/SECURITY.md)
(rate limiting, bot mitigation, session security, password policy — all
free-tier-compatible) and use
[`../docs/GO_LIVE_CHECKLIST.md`](../docs/GO_LIVE_CHECKLIST.md) as the
ordered, start-to-finish launch sequence.

For a native Android build, see [`../android/README.md`](../android/README.md)
— GitHub Actions builds a real APK automatically, no local Android Studio
needed. Preparing for the Play Store specifically — privacy policy,
account deletion, content reporting, data safety answers — is
[`../docs/PLAY_STORE_CHECKLIST.md`](../docs/PLAY_STORE_CHECKLIST.md).

## Deploying to Vercel

```bash
npm i -g vercel
vercel --prod
```

`vercel.json` (already in this folder) handles client-side routing so
direct links to e.g. `/privacy` don't 404. Vercel picks up
`.env.production` automatically during its build — no extra dashboard
configuration needed for `VITE_API_BASE_URL` unless you want to override
it per-environment (Vercel dashboard → Settings → Environment Variables
takes precedence over the committed file if both are set).

Once deployed, add your real Vercel URL to the backend's
`ALLOWED_ORIGINS` (`../backend/wrangler.toml`) and redeploy the Worker —
see `../docs/GO_LIVE_CHECKLIST.md` §6.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |

## Tech

React 18, React Router 6, Tailwind CSS, lucide-react icons. No backend
dependency, no external API calls, no analytics — everything runs offline
once `npm install` has fetched packages once.
