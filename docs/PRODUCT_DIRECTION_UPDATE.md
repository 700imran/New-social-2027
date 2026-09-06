# Product direction update — what changed and why

Two things drove this pass: an updated mockup (`preview.jpg`) showing three
screens the app didn't have yet, and a growth/positioning note arguing
BharatSpace should read as "a place for people, ideas and communities from
everywhere," with India as the starting culture rather than the boundary.

Most of that note is business strategy — creator recruitment targets,
marketing budget splits, launch-market sequencing, a content-first growth
loop. None of that is code, and none of it is pretended to be here. What
follows is only the part that's an actual product/UI decision, and what
was built for each.

## Built this pass

- **Reels** (`src/pages/Reels.jsx`, route `/reels`) — vertical short-form
  feed, For You / Following / Explore tabs, like/comment/share, follow
  from within a reel. Gradient backgrounds stand in for real video, the
  same way `HIGHLIGHTS`/`LIVE_NOW` already used a gradient in place of
  real media elsewhere in this app — there's no video capture/streaming
  pipeline here, mock or otherwise.
- **Communities** (`src/pages/Communities.jsx`, route `/communities`) —
  For You / My Communities tabs, join/leave. Local-only state (see
  `AppContext.jsx`'s `joinedCommunityIds`) — no `communities` table exists
  in the Level 1 schema (`docs/bharatspace_level1_schema.sql`); adding one
  is a schema change, not something to fake silently in the UI.
- **Messages** (`src/pages/Messages.jsx`, route `/messages`) — searchable
  conversation list matching the mockup. Tapping a conversation shows a
  "coming in a future release" toast rather than a fake chat thread —
  real messaging needs its own schema (threads, participants, delivery)
  and almost certainly realtime infrastructure, well beyond a UI screen.
- **Discover redesign** (`src/pages/Discover.jsx`) — subject-first topic
  tabs (Top/News/Tech/Business/Culture/Sports) replace the single hero+
  trending layout; a geographic discovery row (India/Asia/Africa/Europe/
  Middle East/Americas/World) sits *underneath* those tabs as an optional
  lens, not the primary axis — the concrete version of "don't force India
  into every screen." A "Suggested for You" section and a "Browse
  Communities" entry point were added.
- **Reels + Messages entry points** in `HomeTopNav.jsx`. The existing
  bottom nav (Home/Discover/Create/Activity/Profile) was left as-is
  rather than guessed at from the mockup's icon row — it's the app's
  core, tested navigation, and restructuring it on an assumption felt
  riskier than adding two icons to the existing top bar.

## Suggested accounts are fictional

The mockup's "Suggested for You" shows real, named public figures with
verified badges and follow buttons. Nothing here does that — real people
haven't joined this app, and depicting them as if they had (with photos,
follower counts, a Follow button) would misrepresent an affiliation that
doesn't exist. `SUGGESTED_ACCOUNTS` in `src/data/mockData.js` uses
fictional creator/publisher accounts instead (`Global Voices`,
`WanderWithAditi`, `Startup Circle`, `Nature Lens`), in the same spirit as
the app's existing fictional roster (`Tech Bharat`, `India Today`, etc.).

## Not built — strategic, not a screen

Called out explicitly rather than left ambiguous:

- **"Perspective Battles"** (multi-country voting on a question) — a
  genuinely new content type (structured poll + per-region result
  aggregation + its own share format), not a variation on posts. Worth
  scoping as its own feature, not squeezed into this pass.
- **Creator monetization, brand marketplace, live streaming, commerce,
  subscriptions** — explicitly Year 2/3 in the note's own roadmap.
- **Marketing/growth execution** (creator recruitment, ad spend, launch
  sequencing by country) — not a code change at all.
- **Algorithmic personalization** ("what this individual is likely to
  enjoy" vs. "what Indians like") — today's feed is chronological with a
  topic filter, same as before this pass. Real personalization needs
  usage data this app doesn't collect yet, and is worth its own design
  pass rather than a stub that looks smarter than it is.
