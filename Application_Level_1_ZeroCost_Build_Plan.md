# BharatSpace — Application Level 1: Zero-Cost MVP Build Plan
### Target: 10,000 – 100,000 users, minimal infrastructure, near-zero cost

This is the tactical build-companion to the Master Documentation Roadmap. It implements the **P0/MVP scope** from that roadmap on free-tier infrastructure, phase-by-phase, so engineering can start now instead of waiting for the full TRD/SRD to be drafted.

---

## ⚠️ Reality Check First — What "Zero Cost" Actually Gets You

Being upfront, because overstating this now costs you an outage later: **literal $0 all the way to 100,000 users on a commercial, monetized product is not realistic anywhere in the industry.** What *is* realistic is staying at genuinely $0 for the first few thousand users, then scaling spend gradually and only where a specific limit is actually hit — instead of jumping straight to a $1,000+/month cloud bill on day one. Every number below was checked against current (2026) provider documentation and is the thing that becomes the *first* forcing function, not a worst case:

| Growth stage | Realistic monthly cost | What forces the first spend |
|---|---|---|
| 0 – ~5,000 users | **$0** | Nothing yet — comfortably inside every free tier below |
| ~5,000 – 25,000 users | **$0 – ~$25/mo** | Database storage (Postgres free tier caps at 500 MB — a social app's posts/comments/reactions fill this faster than expected) |
| ~25,000 – 75,000 users | **~$25 – 75/mo** | Media storage/egress and edge-function request volume start exceeding free quotas |
| ~75,000 – 100,000 users | **~$75 – 150/mo** | Sustained request volume + realtime connections (notifications/activity feed) + DB compute |

This is still dramatically cheaper than a conventional cloud build (which routinely runs $1,000–5,000+/month at 100K MAU) — but it is not zero. Treat the numbers above as the honest target, not the marketing version.

**One hard constraint to flag now:** if you were planning to host on **Vercel's free "Hobby" plan**, note that Vercel explicitly classifies *any* commercial use — including a platform that charges brands or processes payments — as prohibited on Hobby. Since BharatSpace's commerce engine charges brands, Vercel Hobby is not a compliant option once that engine is live. **Cloudflare's free tier (Pages + Workers) has no such restriction**, which is the main reason it's the recommended host below.

---

## Recommended Zero/Near-Zero Stack

| Layer | Choice | Free allowance (2026) | Why |
|---|---|---|---|
| Hosting + Edge API | **Cloudflare Pages + Workers** | 500 builds/mo, unlimited static requests; Workers: 100K requests/day, 10ms CPU/request | No commercial-use ban (unlike Vercel Hobby); generous static hosting; global CDN included |
| Database + Auth + Realtime | **Supabase (Postgres)** | 500 MB DB, 1 GB file storage, 5 GB egress, **50,000 MAU auth included**, 200 concurrent Realtime connections | One service covers DB, auth, and the realtime layer notifications/activity need; DB storage (not MAU) will be the real ceiling |
| Media storage + delivery | **Cloudflare R2** | 10 GB storage, 1M write ops/mo, 10M read ops/mo, **zero egress fees forever, even paid** | A media-heavy feed lives or dies on egress cost — R2 never charges for it, which is the single biggest cost-saver in this whole stack |
| Cache / rate-limiting | Cloudflare KV or Upstash Redis (free tier) | Enough for session/rate-limit needs at this scale | Keeps hot reads off Postgres |
| Background jobs | Cloudflare Queues / Cron Triggers (free tier) | Sufficient for notification fan-out, digest jobs | No separate worker fleet needed yet |
| Search | Postgres full-text search (built into Supabase) | Included in DB | Avoids running a separate Elasticsearch/Algolia service before it's justified |

**Deliberately not used yet:** dedicated recommendation-ranking infra, video transcoding pipeline, multi-region deployment, managed message queue beyond Cloudflare's own — all correctly belong to later, funded phases (P1–P4 in the master roadmap), not here.

---

## Phase-Wise Build Order (L1.1 – L1.7)

### L1.1 — Foundation
Auth (Supabase Auth), User, Profile, Follow, Block. Deploy skeleton to Cloudflare Pages. This is the only phase with no visible screen yet — pure plumbing.

### L1.2 — Core Social Loop
Post, MediaAsset (single-rendition, see L1.6), Comment, Reaction, Share. Wires up the **Feed** screen with its For You / Trending / India News / Tech / Culture tabs from the mockup — Trending here is a simple engagement-count ranking, not the full recommendation pipeline from the master TRD.

### L1.3 — Discovery Lite
Interest onboarding (the 9-category grid from the mockup: India News, Technology, Business, Sports, Entertainment, Health & Fitness, Education, Environment, Culture), the **Discover** screen (hero + Trending Topics + Live Now list), and Search via Postgres full-text search.

### L1.4 — Activity & Notifications
The **Activity** screen (All / Mentions / Reactions / Comments tabs) powered by Supabase Realtime; notification triggers (mention, reply, follow, trending topic) with basic frequency limits to avoid spam from day one.

### L1.5 — Profile & Growth
The **Profile** screen (stats, Edit Profile, Share Profile, My Topics) and the Follow graph. Track a basic k-factor from day one even before formal analytics infra exists (Phase 8) — it's cheap to log now and expensive to reconstruct later.

### L1.6 — Media Handling (Level 1 Version)
Upload → client-side compress/resize (in-browser, before it ever hits the server) → store the single resulting file in R2 → serve via Cloudflare's CDN. This is a deliberate stand-in for the full Media Engine in the master roadmap's Phase 6 (no content-aware multi-rendition encoding yet — that requires real compute budget). It sits behind one function, e.g. `getPlaybackUrl(assetId)`, so that when the full adaptive-bitrate pipeline is built later, the frontend calling that function never has to change.

### L1.7 — Scale-Readiness Gate
Before touching a single line of new feature code past this point, wire up basic usage monitoring against the ceilings in the Reality Check table: DB size, R2 storage, Workers daily requests, Realtime concurrent connections. Define explicit trigger thresholds (e.g., "DB > 350 MB → schedule the move to Supabase Pro that week," not "wait for it to break"). This turns cost increases into planned, small steps instead of a surprise outage.

---

## The Invisible-Scaling Principle, Concretely

Every place Level 1 cuts a corner for cost reasons, it cuts the corner **behind an interface**, not in the screen the user sees:

- `MediaService.getPlaybackUrl(assetId)` — today returns a single R2 file URL; later returns an adaptive-bitrate manifest. Frontend code is unchanged.
- `MatchingService.suggestCreators(campaignId)` — today is a manual/admin-curated shortlist (matches the master roadmap's "managed marketplace" approach for early stage); later becomes the AI-scored matching layer from P3. The Brand's screen and workflow don't change.
- `FeedRankingService.getForYou(userId)` — today is engagement-count + recency; later is full candidate-generation → ranking → re-ranking. Same feed screen, same tabs, same interaction patterns.

This is exactly what makes Level 1 *not* a throwaway prototype: it is the real P0 from the Master Roadmap's Release Roadmap, built cheaply on purpose, with named seams where the expensive version slots in later without users noticing a redesign.

---

## Explicitly Deferred Past Level 1
- Full content-aware, multi-rendition adaptive video transcoding (master roadmap Phase 6)
- AI-driven creator–brand matching / pricing intelligence (master roadmap Phase 8, P3)
- Multi-region infrastructure and dedicated recommendation-ranking service
- Formal Admin/Ops control center (Phase 8) — Level 1 uses direct DB/dashboard access for the founding team only, which is fine at this scale but must not be mistaken for the audited admin system Phase 8 will require once the team grows

---

## Cross-Reference to the Master Roadmap
This document implements the **P0 (MVP)** scope of the Release Roadmap (Master Roadmap, Phase 8) and is the working draft of the "Technology Selection" section of the **TRD (Phase 2)** for the MVP stage. When Phase 2 is formally drafted, its Technology Selection section should point back here rather than duplicate it.
