# BharatSpace — 8-Phase Documentation Execution Roadmap (v2)

**v2 update:** Incorporates the approved UI mockup (branding, screens, navigation) as a locked visual reference, adds a **Deliverables Index**, and adds the **Application Level 1 — Zero-Cost Build Track** that runs alongside this roadmap so engineering can start building immediately while Phases 2–8 are still being drafted.

**Purpose:** Convert the unified architecture (four engines: Social/Attention, Creator–Brand Commerce, Media Infrastructure, Trust/Privacy Governance) into a complete, engineering-ready documentation set — without producing one giant, internally-inconsistent PRD. Each phase is a standalone deliverable that **freezes decisions** the next phase depends on. Execute strictly in order; skipping ahead risks rework.

**Master rule across all phases:** same entity names, same IDs, same terminology, same workflow names must be reused everywhere.

---

## 🔒 Visual Reference — Locked (from uploaded mockup)
The following is now **frozen** and every phase below must build to it, not around it:
- **Brand:** BharatSpace — tricolor "B" mark, tagline *"People • Ideas • India"*, positioning *"India's Real-Time Social Network"*, sub-line *"Local Voices | Real Stories | Stronger Together"*
- **Primary nav (bottom bar):** Home, Discover, Create (+), Activity, Profile
- **Feed tabs:** For You, Trending, India News, Tech, Culture
- **Screens confirmed:** Onboarding "What interests you?" (9 categories: India News, Technology, Business, Sports, Entertainment, Health & Fitness, Education, Environment, Culture) → Feed → Discover ("What's Happening Now" hero, Trending Topics, Live Now) → Create Post (Photo/Video/Poll/Article + topic-relevance toggle) → Activity (All/Mentions/Reactions/Comments) → Profile (stats, Edit/Share Profile, My Topics)
- **Value props ("Why BharatSpace"):** Real People, Real-Time Updates, Meaningful Engagement, A Stronger India

**Effect on this roadmap:** Phase 7 (UI/UX Spec) is no longer a from-scratch design phase — it becomes a *systemization* pass (extract the design system already visible in the mockup: colors, typography, component patterns) rather than new visual design. This pulls Phase 7 effort forward and de-risks it.

---

## 📋 Deliverables Index

| Phase | Deliverable file(s) |
|---|---|
| 1 | `PRD.md` + **`Design_Reference_Brand_Guide.md`** (new — captures the mockup) |
| 2 | `TRD.md` |
| 3 | `SRD.md` |
| 4 | `Workflow_StateMachines.md` |
| 5 | `DB_Schema.md` + ERD |
| 6 | `API_Spec.md` + `Media_Engine_Spec.md` + `Commerce_Engine_Spec.md` |
| 7 | `UIUX_Spec.md` (systemized from mockup) |
| 8 | `Security_Trust_Governance.md` + `Analytics_BI_Spec.md` + `Admin_Ops_Spec.md` + `Infra_DevOps_Spec.md` + `QA_Testing_Spec.md` + `Release_Roadmap.md` |
| **Parallel track** | **`Application_Level_1_ZeroCost_Build_Plan.md`** (new — see below) |

---

## Phase 1 — Master PRD v1.0
**Goal:** Freeze *what* is being built and *why*.
**Deliverables:** `PRD.md`, `Design_Reference_Brand_Guide.md`
**Contents:** Product vision & principles; personas (User, Creator, Brand, Admin); user journeys (now traceable directly to the locked mockup screens above); feature requirements by surface (Social/Feed, Creator, Brand, Commerce, Media, Privacy/Expression, Notifications, Communities, Live, Search/Discovery, Moderation, Admin); monetization model (GMV vs. take-rate vs. gross revenue vs. contribution margin, defined separately); seeding/launch targets (10K creators → 8K completed profiles → 5K active → 25K+ content pieces); KPIs & acceptance criteria per feature area.
**Depends on:** Nothing.
**Exit criteria:** Every mockup screen has a matching PRD feature entry; every feature has a one-line acceptance criterion.

---

## Phase 2 — TRD (Technical Requirements & Architecture)
**Goal:** Freeze *how* it's built at the system level.
**Deliverable:** `TRD.md`
**Contents:** 4-engine system architecture + modular-monolith rationale; service/module boundaries (Identity/Auth, Profile, Social Graph, Content/Post, Feed/Recommendation, Search, Notification, Community, Media, Creator, Campaign, Contract/Deliverable, Payment/Ledger, Analytics, Moderation, Trust & Safety); frontend/backend architecture, API gateway, auth strategy; DB architecture; cache, search, event bus/queues, object storage, CDN; media processing pipeline (full version — see note below); recommendation infrastructure; payment architecture (immutable ledger); observability, DR, scalability; technology selection & rationale.
**Note:** The **full** Media Engine and Recommendation Infra described here are the long-term (funded/scale) versions. The **Application Level 1** track (below) implements deliberately simplified stand-ins for both at zero cost, behind the same interfaces this TRD defines — so the swap later is invisible to users. Phase 2 should explicitly document this "simple-now, same-interface" pattern as a first-class architectural principle, not an afterthought.
**Depends on:** Phase 1.
**Exit criteria:** Every service boundary is named and unambiguous; every zero-cost simplification in the Level 1 track has a named interface it sits behind.

---

## Phase 3 — SRD (Software/System Requirements)
**Goal:** Turn architecture + features into testable, unambiguous requirements.
**Deliverable:** `SRD.md`
**Contents:** Functional requirements mapped 1:1 to PRD features; non-functional requirements; roles & permissions matrix; business rules; error handling & edge cases; security requirements summary; audit & data-retention requirements; QA-ready acceptance criteria.
**Depends on:** Phase 1 + Phase 2.
**Exit criteria:** A QA engineer could write test cases without clarification.

---

## Phase 4 — App Workflow & State Machine Specification
**Goal:** Freeze every sequence of steps and every status a record can be in.
**Deliverable:** `Workflow_StateMachines.md`
**Contents:** End-to-end workflows (Signup → Interest onboarding → Feed → Post → Comment/Reaction → Follow → Search → Trending → Live → Communities → Local discovery; Creator onboarding; Brand onboarding; Campaign → Matching → Offer/Acceptance → Delivery → Revision → Approval → Payout → Dispute; Notification triggers with frequency limits; Account restriction → Appeals; Government-request workflow); formal state machines (states + transitions + triggers + terminal states) for Campaign, Deliverable, Approval, Payout, Dispute, Moderation Case, Government Request.
**Depends on:** Phase 1 + Phase 3.
**Exit criteria:** Every entity needing a `status` field in Phase 5 has a complete, closed state machine here first.

---

## Phase 5 — Database Schema / ERD
**Goal:** Freeze the data model.
**Deliverable:** `DB_Schema.md` + ERD
**Contents:** Full entity list (User, Profile, PrivacyPreference, Interest, UserInterest, Follow, Block, Post, MediaAsset, Comment, Reaction, Share, Topic, Community, CommunityMember, LiveSession, Notification, CreatorProfile, Brand, Campaign, CampaignRequirement, CreatorOffer, CreatorAcceptance, Deliverable, Revision, Approval, Dispute, Transaction, Payout, PlatformFee, Refund, PerformanceMetric, GovernmentRequest, ModerationCase, Appeal, AuditLog); per-entity PK/FK/indexes/constraints/status fields (from Phase 4)/timestamps/retention/audit relationships; immutable append-only ledger design for financial tables; media metadata vs. object-storage reference split.
**Depends on:** Phase 4, Phase 3.
**Exit criteria:** Every workflow step in Phase 4 has a corresponding table/field; schema also validated against the **Application Level 1** entity subset (L1.1) so the MVP build isn't working off a different model.

---

## Phase 6 — API Specification + Media & Commerce Engine Technical Specs
**Goal:** Freeze the contracts between frontend, backend, and the two most infrastructure-heavy engines.
**Deliverables:** `API_Spec.md`, `Media_Engine_Spec.md`, `Commerce_Engine_Spec.md`
**Contents:** REST/GraphQL boundary, auth/authorization model, versioning; domain-by-domain endpoints (`/auth /users /profiles /feed /posts /comments /reactions /follows /search /trending /communities /live /creators /brands /campaigns /offers /deliverables /approvals /payouts /analytics /notifications /moderation /appeals /admin`); full Media Engine spec (Upload Gateway → Object Storage → Queue → Analysis → Content-Aware Encoding → Renditions → Thumbnail → CDN → Adaptive Playback, codec strategy, cost metrics); full Commerce Engine spec (funnel + GMV/take-rate/contribution-margin formulas).
**Depends on:** Phase 5.
**Exit criteria:** Every DB entity has at least one endpoint; the endpoint contracts here are exactly what Application Level 1 implements a lean version of — no divergent API shapes.

---

## Phase 7 — UI/UX Design Specification
**Goal:** Systemize the already-approved visual design (see Locked Visual Reference above).
**Deliverable:** `UIUX_Spec.md`
**Contents:** Design principles, information architecture, navigation (already fixed by the mockup); design system — typography, color system, components (buttons, cards, feed) extracted from the mockup; screen-level specs for Creator Dashboard, Brand Dashboard, Campaign Workspace, Admin Dashboard (not yet mocked — net-new design work); empty/error/loading states; accessibility; responsive behaviour.
**Depends on:** Phase 4, Phase 6, the locked mockup.
**Exit criteria:** Every consumer-facing workflow step has a named screen/state; dashboards (Creator/Brand/Admin) — the only screens not yet visually designed — have specs ready for a designer.

---

## Phase 8 — Security, Trust, Analytics, Ops & Release Roadmap
**Goal:** Freeze everything cross-cutting, plus the build sequence.
**Deliverables:** `Security_Trust_Governance.md`, `Analytics_BI_Spec.md`, `Admin_Ops_Spec.md`, `Infra_DevOps_Spec.md`, `QA_Testing_Spec.md`, `Release_Roadmap.md`
**Contents:** Security & Privacy (auth, MFA, encryption, RBAC/ABAC, audit logs, secrets, rate limiting, abuse prevention, secure payments, data minimization, retention, incident response); Trust/Expression/Governance (government-request review, legal challenge, transparency); Analytics & BI (Social/Creator/Brand/Financial KPIs); Admin/Ops (control-center scope, RBAC+approval+audit trail); Infra/DevOps (environments, CI/CD, monitoring, autoscaling, backup, DR); QA/Testing; Release Roadmap P0 (MVP) → P1 (Network) → P2 (Commerce) → P3 (Intelligence) → P4 (Infrastructure Moat).
**Note:** **P0 in this Release Roadmap *is* the Application Level 1 build** — they must describe the same scope. P1–P4 are exactly the points at which Level 1's zero-cost stand-ins (simplified media handling, manual creator-matching, single-region hosting) get swapped for their full versions from Phase 2/6 — invisibly to the user, per the principle below.
**Depends on:** All previous phases.
**Exit criteria:** Full doc set internally consistent; P0 is buildable from Phases 1–7 alone.

---

## 🔁 Application Level 1 — Zero-Cost Build Track (runs in parallel, starting now)

A separate, standalone document — **`Application_Level_1_ZeroCost_Build_Plan.md`** — specifies how to actually *build and ship* the P0/MVP scope on free/near-zero-cost infrastructure, capable of scaling toward 10,000–100,000 users, without waiting for Phases 2–8 to be fully drafted. It exists because a founder doesn't have to choose between "have documentation" and "have a working app" — this track lets engineering start immediately.

**Governing principle — Invisible Scaling:** every simplified/zero-cost implementation in Level 1 sits behind the exact same interface that the eventual full-scale version (defined later in Phases 2 and 6) will use. When infrastructure is swapped out for a paid, higher-capacity version, **the screens, navigation, and workflows a user sees do not change** — only what happens behind the API contract changes. This is what keeps this Master Roadmap and the Level 1 build from drifting apart: Level 1 is not a prototype to be thrown away, it *is* P0, built cheaply on purpose.

See the companion document for the full stack choice, phase-by-phase build order (L1.1–L1.7), honest cost/capacity ceilings at each user-count milestone, and the explicit list of things intentionally deferred past Level 1.

---

## Execution Notes
- Phases 1→3 are pure requirements/architecture. Resist jumping to DB schema before Phase 4's state machines exist.
- Phases 4→5→6→7 form the core "build spec" chain.
- Phase 8 is last because it audits everything above it and needs the full scope known.
- The **Application Level 1** track runs *alongside*, not instead of, Phases 2–8 — it is the fast, cheap, real-world implementation of whatever Phase 2/6 will later formalize at full scale.
- Recommended format: Markdown while drafting; convert the finished set to PDF/Word once each phase is approved.

**When ready, say "Phase 1" to get the full Master PRD v1.0, or "Level 1" to get the Application Level 1 build plan first.**
