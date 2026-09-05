# Play Store readiness checklist

You said you're not publishing yet but want to be ready to. This is
organized the same way: what's already built and working, what you'll
type into Play Console when the time comes (with exact answers), and
what's genuinely manual no matter what (screenshots, the Console account
itself).

## Already built

- **Privacy Policy** — `/privacy` (`src/pages/Privacy.jsx`), publicly
  accessible, no login required. This is the URL Play Console's Store
  Listing asks for. **Update `SUPPORT_EMAIL` in that file before you
  publish anywhere** — it's currently a placeholder.
- **Terms of Service** — `/terms` (`src/pages/Terms.jsx`), same deal.
- **Account & data deletion** — required by Google Play for any app that
  supports account creation, whether or not the user still has the app
  installed:
  - In-app: Edit Profile → Danger Zone → type `DELETE` to confirm. Calls
    `DELETE /v1/account` (`backend/src/routes/account.js`), which deletes
    the account's database rows (cascading via the schema's own foreign
    keys) *and* their actual uploaded photos/videos from R2 — not just
    metadata.
  - Web, no app/login required: `/delete-account-request`
    (`src/pages/DeleteAccountRequest.jsx`) — this is the URL for Play
    Console's "Account deletion" field.
- **Content reporting** — required by Google Play's User Generated
  Content policy. Tap "···" on any post → Report → pick a reason →
  submit. Backend: `POST /v1/reports`, needs
  `docs/migrations/002_reports.sql` run once against your Supabase
  project (it isn't part of the original schema file — additive only).
- **Blocking** — also required alongside reporting by the same UGC
  policy. Same "···" menu → Block. Blocked accounts' posts are filtered
  out of your feed immediately (`AppContext.jsx`'s `visiblePosts`).

**How to actually review incoming reports today**: open your Supabase
project's Table Editor → `reports` table. There's no admin dashboard
built for this yet — for a small app, the Table Editor is a completely
reasonable way to triage reports by hand (sort by `status = 'open'`,
mark `status = 'actioned'`/`'dismissed'` after you deal with each one).
Worth building a real admin view once report volume makes that tedious.

## Data Safety form — exact answers

Play Console → your app → App content → Data safety. This is filled in
Console's own UI, not a file in the repo — here's what to select based on
what this app actually does:

**Does your app collect or share user data?** Yes.

| Data type | Collected? | Shared with third parties? | Purpose |
|---|---|---|---|
| Email address | Yes | No | Account creation, authentication |
| Phone number | Optional (if used instead of email) | No | Account creation, authentication |
| Name | Yes (display name) | No | App functionality |
| User IDs | Yes | No | Account management |
| Photos/videos | Yes (if user uploads) | No | App functionality |
| Other user-generated content | Yes (posts, comments) | No | App functionality |
| App interactions | Yes (via Cloudflare's request logs) | No | Analytics, security/fraud prevention |
| IP address | Yes | No | Security/fraud prevention |

- **Is data encrypted in transit?** Yes (HTTPS everywhere).
- **Can users request data deletion?** Yes → provide `/delete-account-request`.
- **Is data collection required or optional?** Email/phone + password are
  required to create an account; everything else (bio, location, photo)
  is optional.

If you turn on Turnstile (`docs/SECURITY.md` §2) or add real analytics
later, come back and update this form — it must stay accurate to what's
actually collected, and Google does check.

## Content rating questionnaire — guidance

Play Console → App content → Content rating. Answer honestly based on
what the app allows (open-ended UGC), not what a "well-behaved" user
would post:

- **User-generated content**: Yes
- **Users can communicate with each other**: Yes (posts, comments)
- **Shares user location**: No (location is a free-text profile field,
  not device GPS)
- **Violence, sexual content, profanity**: answer "may contain
  user-generated instances of" for each, since posts aren't
  pre-moderated before publishing — the reporting/blocking system is
  your mitigation, not prevention.

This questionnaire determines the age rating (likely Teen or Mature 17+
for an app with open UGC and user communication) — expect that outcome
rather than being surprised by it.

## Store listing — draft copy

Short description (max 80 characters):
```
Real people, real ideas — discover perspectives from India and beyond.
```

Full description (draft — edit to taste, max 4000 characters):
```
BharatSpace is a social platform for sharing ideas, discovering
perspectives, and connecting with people and communities — starting in
India, built for anyone, anywhere.

• Share posts and photos with your followers
• Discover trending topics across Technology, Business, Culture, Sports,
  and more
• Explore Reels — short-form video from creators around the world
• Join Communities built around shared interests
• Follow the people and perspectives you care about

BharatSpace is free to use. Report or block any content or account that
violates our community standards — see our Terms of Service in-app.
```

- **Category**: Social
- **App icon**: `../android/assets/icon.png` (1024×1024, already
  generated from the app's logo)
- **Feature graphic** (1024×500) and **screenshots** (min 2, various
  device sizes) aren't generated here — they need to come from the
  actual running app. Once you have the APK built and running (see
  `../android/README.md`), take screenshots on-device or in
  Android Studio's emulator of: the Home feed, Discover, a Reel, and
  Communities — those are the most visually distinct screens.

## What's still genuinely manual

No amount of code changes this — these require your own Play Console
account and human judgment:

- Creating the Play Console developer account itself ($25 one-time fee,
  Google's own process)
- Uploading the signed `.aab` (see `../android/README.md`'s
  signing section)
- Taking real device/emulator screenshots
- Designing a feature graphic (1024×500 banner) if you want one beyond
  the app icon
- Choosing a release track (internal testing → closed → open → production)
  — internal testing first is standard practice, and doesn't require any
  of the store-listing polish above, just the signed build

## Before you actually submit

- [ ] Replace the placeholder `SUPPORT_EMAIL` in `Privacy.jsx`,
      `Terms.jsx`, and `DeleteAccountRequest.jsx` with a real, monitored
      address
- [ ] Have `Privacy.jsx`/`Terms.jsx` reviewed by a lawyer if you'll have
      real users — see the disclaimer at the bottom of each page
- [ ] Run `docs/migrations/002_reports.sql` against your Supabase project
      if you haven't already (reporting won't work without it)
- [ ] Test the full loop yourself: report a post, block an account, then
      delete a test account and confirm its posts/photos are actually
      gone
