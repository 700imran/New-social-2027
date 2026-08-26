# BharatSpace

India's real-time social network — a fully interactive frontend MVP, plus a
reference backend you can plug in when you're ready to go live.

```
bharatspace/
├── src/                 ← the app (React + Vite + Tailwind). Runs standalone.
├── backend/             ← Cloudflare Workers + Supabase reference API
├── docs/                ← the backend planning docs this was built from
└── ARCHITECTURE.md      ← how the two sides connect
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

All of it is powered by `src/context/AppContext.jsx`, an in-memory store —
refreshing the page resets state, which is expected for a frontend-only demo.

## Going live with the backend

`backend/` is a working Cloudflare Workers + Supabase implementation of the
`/v1/...` API this frontend is already shaped around (see
[`ARCHITECTURE.md`](./ARCHITECTURE.md) and
[`docs/Application_Level_1_Execution_Guideline.md`](./docs/Application_Level_1_Execution_Guideline.md)).
It's not connected by default — follow `backend/README.md` to deploy your
own Supabase project + Worker, then set `VITE_API_BASE_URL` to switch this
frontend from mock data to your live API.

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
