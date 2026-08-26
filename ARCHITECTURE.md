# Architecture: mock frontend → live backend

This app was built in two passes. Pass one: a complete, self-contained
frontend MVP with no backend, as originally scoped — sign-up is a formality,
all state lives in React. Pass two: `docs/Application_Level_1_Execution_Guideline.md`
and `docs/bharatspace_level1_schema.sql` arrived, describing the real
backend this is meant to grow into — so `backend/` and `src/api/client.js`
were added to make that transition a swap, not a rewrite.

## The three models, and where each currently lives

| Model | Guideline scope | Frontend today | Backend (`backend/`) |
|---|---|---|---|
| 1. User & Trust | identity, profile, follows, consent, audit | `AppContext.jsx`: `signUp`, `signIn`, `toggleFollow`, `updateProfile` — in-memory, unverified | `routes/auth.js`, `routes/users.js`, `routes/follows.js`, `routes/consent.js` — real Supabase Auth + RLS |
| 1 (social surface) | posts/comments/reactions/notifications | `AppContext.jsx`: `createPost`, `addComment`, `toggleLike`, `notifications` state | `routes/posts.js`, `routes/notifications.js` |
| 2. Creator–Brand Commerce | brands/campaigns/offers/deliverables/ledger | Not used by the UI — the mockup this was built from doesn't have a commerce surface | `routes/campaigns.js` — schema-complete, endpoints work, deliberately not wired to any screen, matching the guideline's "dormant until prioritized" instruction |
| 3. Media | uploads, storage, playback | `CreatePost.jsx`: `FileReader` → base64 data URL, kept in React state only | `routes/media.js` — real presigned R2 upload URLs |

## The seam

`src/api/client.js` is a thin fetch wrapper whose function names mirror the
backend's routes one-to-one (`follow`, `createPost`, `uploadMedia`, ...). It
is **not imported anywhere in the app yet.** `AppContext.jsx` is the only
place that would need to change to go live: swap a function body from local
`setState` to an `await` call into `api/client.js`, keep the same
function signature, and every page that calls `useApp()` keeps working
unmodified — the same principle the guideline uses for
`MediaService.getPlaybackUrl()` and `MatchingService.suggestCreators()`.

Concretely, going live means:

1. Deploy `backend/` against your own Supabase + Cloudflare account (steps
   in `backend/README.md`).
2. Set `VITE_API_BASE_URL` in the frontend's `.env.local`.
3. In `AppContext.jsx`, replace the body of each action (not its signature)
   with the matching call from `api/client.js`, and switch the relevant
   state from synchronous values to something that tracks loading/error
   (e.g. wrap reads in a small `useEffect` + `useState`, or bring in a
   fetch library like `swr`/`react-query` if the app grows past a few
   screens' worth of async state).
4. Real auth: swap the sign-up/sign-in forms' `onSubmit` handlers to call
   `api/client.js`'s `signUp`/`signIn`, store the returned `accessToken`
   via `setAccessToken()`, and remove the "anything works" validation.

Nothing in `src/pages/` or `src/components/` needs to change for this —
they only ever talk to `AppContext`, never to data or API calls directly.

## Why the frontend doesn't call the backend by default

The original brief was explicit: a working, interactive frontend, not tied
to a database, with sign-up as a formality. That's a legitimate end state
on its own — for demos, usability testing, or investor walkthroughs — not
just a waypoint. Wiring it to a real backend is meaningfully more surface
area (loading states, error states, retries, real auth token handling) that
would have made every screen more complex without changing what it looks
like or how it feels to use. The seam above is designed so that work is
additive whenever you're ready for it, not a blocker before then.
