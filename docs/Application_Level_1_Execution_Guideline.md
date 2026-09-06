# BharatSpace — Application Level 1: Execution Guideline
### Security Schema, API Design & Minimal Backend — Zero Cost, Built to Slot Into a Bigger Backend Later

**How this fits with the other two documents:**
- `BharatSpace_8Phase_Documentation_Roadmap.md` — the full documentation plan (PRD → ... → Release Roadmap)
- `Application_Level_1_ZeroCost_Build_Plan.md` — *what order* to build in (L1.1–L1.7) and *which stack* to use
- **This document** — the actual schema, API contracts, and security implementation to start writing code today, organized around the **3 consolidated core models**, with every zero-cost shortcut built behind a named seam so it slots into the funded/full backend later without a rewrite.
- Companion file: **`bharatspace_level1_schema.sql`** — the runnable schema for everything below.

---

## 1. The 3 Core Models (execution structure)

Keeping four separate engines (Social, Commerce, Media, Trust/Governance) as four separate services would be unnecessary complexity at this stage. Folded into **3 core models**, each becomes one module inside the single modular-monolith backend:

1. **User & Trust Model** — identity, profile, follow graph, privacy/consent, and audit — absorbs what would otherwise be a separate "Trust/Governance" service, because at Level 1 scale they share the same core entity (the user) and the same DB.
2. **Creator–Brand Commerce Model** — the full Brand → Campaign → Offer → Deliverable → Payout cycle. Schema exists from day 1; active feature build is deliberately minimal until Level 1's social core is proven.
3. **Media Infrastructure Model** — upload, storage, and delivery for all images/video, absorbed into the same backend as an interface rather than a separate service, with the clearest scale-seam of all three (this is the one you specifically flagged).

Each is detailed below as: **Schema → API → Security → Scale Seam**.

---

## 2. Day-1 Technology Choices That Must Be Right From the Start
These cost nothing extra today, but are expensive to retrofit once real users/data/money are flowing through them — so they're non-negotiable from commit #1:

| Choice | Why it must be day-1 |
|---|---|
| **UUID primary keys**, not auto-increment ints | Merging/sharding data later without UUIDs means rewriting every foreign key by hand |
| **Postgres Row-Level Security (RLS)** | Free, built into Supabase's Postgres. Enforces "users only touch their own rows" *at the database level* — even a buggy API route can't leak data |
| **Append-only ledger + audit log** (DB rule blocks UPDATE/DELETE) | Once real campaign money or moderation history exists, retrofitting immutability is a legal and data-integrity mess. Costs nothing to enforce from day 1 |
| **Presigned upload URLs** (client → R2 directly) | The Worker's free-tier CPU budget is 10ms/request — nowhere near enough for handling file bytes. Presigned URLs mean the Worker only ever does a tiny "check auth, hand out a URL" call |
| **API versioning (`/v1/...`)** | Free to add now, painful breaking change to add after clients are already calling unversioned routes |
| **JSONB extension columns** (`renditions`, `requirements`, `metadata`) | Lets the full-scale engine (encoding pipeline, campaign matching) attach richer data later without a schema migration |
| **A single feature-flag mechanism** (even one config table/row) | Lets you flip a "stub" implementation to its "scaled" replacement without a risky big-bang redeploy |

---

## 3. Model 1 — User & Trust: Schema, API, Security

**Schema:** `users`, `roles`, `user_roles`, `profiles`, `follows`, `blocks`, `consent_preferences`, `audit_log` — see `bharatspace_level1_schema.sql`. Roles are a many-to-many join (not a single column) specifically so richer permission logic can be layered on later without a migration.

**API (`/v1/...`):**
```
POST   /v1/auth/signup            (email or phone)
POST   /v1/auth/otp/verify
POST   /v1/auth/login
POST   /v1/auth/logout
POST   /v1/auth/mfa/enroll        (optional TOTP — free via Supabase Auth)
GET    /v1/users/:id
GET    /v1/profiles/:id
PATCH  /v1/profiles/:id
POST   /v1/follows                { followee_id }
DELETE /v1/follows/:followeeId
GET    /v1/users/:id/followers
GET    /v1/users/:id/following
POST   /v1/blocks                 { blocked_id }
GET    /v1/consent
PATCH  /v1/consent
```

**Security, concretely, all at $0:**
- **Auth:** Supabase Auth handles password hashing, OTP (phone — relevant for an India-first product), session/JWT issuance. Don't build this yourself; it's free and already correct.
- **Every Worker route** verifies the Supabase JWT before touching the DB — a ~10-line check, no library needed beyond Supabase's JWKS endpoint.
- **RLS policies** (see `.sql` file) are the real backstop — even if a route's auth check has a bug, the database itself refuses cross-user writes.
- **Rate limiting:** Cloudflare's free plan includes a small number of rate-limiting rules — apply them to `/v1/auth/*` first (the highest-abuse-risk routes).
- **MFA:** offer TOTP enrollment for `creator` and `brand` roles specifically — those accounts are higher-value targets, and it costs nothing extra to enable.
- **Audit log:** every role change, block, and consent update writes an `audit_log` row from day 1 — trivial now, and Phase 8's formal audit requirements are already satisfied retroactively when you get there.

**Scale seam:** `user_roles` is many-to-many so ABAC-style rules can be layered on later. `audit_log` is already the exact shape Phase 8's compliance work needs — nothing to redo.

---

## 4. Model 2 — Creator–Brand Commerce: Schema, API (Reserved)

**Schema:** `brands`, `campaigns`, `creator_offers`, `deliverables`, `transactions` (append-only ledger) — created now, at zero cost, even though the matching/payout *feature* isn't part of Level 1's active build order (L1.1–L1.7 is social-first). The reason to create it now anyway: retrofitting an immutable ledger structure after real campaign money has already moved through a mutable table is far more expensive than defining it correctly up front, and it costs literally nothing to define an unused table.

**API (stubbed, not fully wired):**
```
POST   /v1/campaigns              (brand only — basic CRUD)
GET    /v1/campaigns/:id
POST   /v1/campaigns/:id/offers
PATCH  /v1/offers/:id             (accept/decline)
POST   /v1/deliverables
GET    /v1/campaigns/:id/performance   (returns "coming soon" until Phase 8/P2)
```

**Scale seam:** all creator-matching logic sits behind one function, `MatchingService.suggestCreators(campaignId)`. Level 1's implementation is a manual, admin-curated shortlist (matches the Master Roadmap's own "managed marketplace, not full AI, at this stage" guidance) — the Brand-facing screen and workflow never change when this gets replaced by the scored/automated matching layer in P3.

---

## 5. Model 3 — Media Infrastructure: Schema, API, Security, Scale Seam
*(This is the one you flagged explicitly — most detail goes here.)*

**Schema:**
```sql
media_assets (
  id, owner_id, storage_key, mime_type, size_bytes,
  rendition_strategy default 'single',   -- 'single' now → 'adaptive' later
  renditions jsonb default '{}',          -- populated by the full Media Engine later
  created_at
)
```
The `rendition_strategy` and `renditions` columns exist **now**, unused, for exactly one reason: when the full content-aware encoding pipeline (Master Roadmap Phase 6) is eventually built, it writes into this same row instead of requiring a new table or a data migration.

**API:**
```
POST /v1/media/upload-url    { mimeType, sizeBytes } → { assetId, uploadUrl, expiresIn }
GET  /v1/media/:id           → { url, mimeType, renditionStrategy }
```

**Day-1 flow (no server-side transcoding — the Worker's 10ms CPU budget genuinely cannot do it):**
1. Browser compresses/resizes the image or short video **client-side** (a small JS library is enough for images; video is kept short/low-res at capture time rather than transcoded).
2. Client calls `POST /v1/media/upload-url`; the Worker checks auth, checks the declared size against a hard cap, and returns a short-lived (~5 min) presigned R2 PUT URL — this whole call costs well under 1ms of CPU.
3. Browser uploads the compressed file **directly to R2**, bypassing the Worker entirely for the actual bytes.
4. `GET /v1/media/:id` returns the R2/CDN URL for playback.

**Security specifics:**
- Presigned URLs expire in minutes, not hours.
- File size and MIME type are validated **server-side** in the Worker before issuing the URL — never trust a client-declared size alone.
- Full malware/content-abuse scanning is out of scope for Level 1 and is explicitly a Phase 8 requirement — flag this as a known gap, not a silent omission.

**The scale seam, concretely:** everything above is reached through one function — `MediaService.getPlaybackUrl(assetId)`. Today it reads `storage_key` and returns a single R2 file URL. When the full Media Engine exists, the same function reads `renditions` and returns an adaptive-bitrate manifest instead. **The frontend calling this function is never touched.** This is the literal mechanism that satisfies "scales later without visible change to users."

---

## 6. What's Explicitly Deferred (and where it plugs back in)
| Deferred now | Plugs in later at | Seam already in place |
|---|---|---|
| Multi-rendition adaptive video transcoding | Master Roadmap Phase 6 (Media Engine) | `rendition_strategy` / `renditions` columns, `getPlaybackUrl()` |
| AI creator–brand matching & pricing | Master Roadmap Phase 8 / P3 | `MatchingService.suggestCreators()` |
| Formal audited admin console | Master Roadmap Phase 8 | `audit_log` already logging everything it needs to |
| Malware/content-abuse scanning on uploads | Master Roadmap Phase 8 (Security spec) | Upload endpoint already validates size/MIME; scanning slots in as an added check, not a redesign |
| Full ABAC permissions | — | `user_roles` many-to-many join already supports it |

---

## 7. Where This Fits in the Build Order
Run `bharatspace_level1_schema.sql` at the start of **L1.1** (Foundation) from the Zero-Cost Build Plan. Model 1's API and RLS policies are built during L1.1; Model 3's upload flow is built during **L1.6**; Model 2's schema is created alongside L1.1 (five minutes of extra SQL) but its endpoints stay dormant until the commerce engine is actually prioritized.
