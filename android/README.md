# BharatSpace — Android wrapper

A native Android app for the BharatSpace web app at the repo root (`..`),
built with [Capacitor](https://capacitorjs.com). Kept in this separate
folder rather than mixed into the root — this is a thin native shell
around the same web build, not a second copy of the app. Backend lives in
`../backend`, docs covering all of it in `../docs`.

## What's already done here

- Capacitor installed and configured (`capacitor.config.json`)
- The native `android/` Gradle project scaffolded (`npx cap add android`)
- App icon + adaptive icon (all densities) + splash screen (light/dark,
  portrait/landscape) generated from the app's logo — see `assets/` for
  the sources and `android/app/src/main/res/` for every generated size
- `INTERNET` permission present in `AndroidManifest.xml`
- The web app's production build — **already pointed at the real backend**
  (`https://new-social-2027.imrankhan210r.workers.dev`, baked in via
  `../.env.production`) — copied into `www/` and synced into the
  native project
- A GitHub Actions workflow (`../.github/workflows/build-apk.yml`) that
  builds a real, installable, **release-signed** APK automatically, using
  the one permanent keystore described below — see "Signing a release
  build"

## Getting an actual `.apk` — two ways

### Option A: GitHub Actions (recommended — no local setup at all)

Compiling requires downloading Gradle and the Android Gradle Plugin from
Google's servers. This sandbox can't reach those (verified directly —
see "Why not build it here" below), but **GitHub's own runners can**,
which is exactly what this repo's workflow uses:

1. Push this whole bundle to a GitHub repo (`web/`, `backend/`,
   `android/`, `docs/`, and `.github/` all at the repo root, as they are
   in this zip).
2. GitHub → your repo → **Actions** tab → **Build Android APK** →
   **Run workflow** (or just push to `main` — it runs automatically).
3. Wait a few minutes. Open the finished run → **Artifacts** →
   `bharatspace-beta-<version>` → download. That's a real, release-signed,
   installable `.apk` — as long as the four `RELEASE_*` secrets below are
   set, it's signed with the same permanent key every time, so it
   installs over whatever version is already on the phone instead of
   requiring an uninstall first.
4. Transfer it to your phone (email it to yourself, Google Drive, USB —
   anything) and open it. Android will ask to allow installing from this
   source the first time; allow it.

**If your build fails with `cordova.variables.gradle` not found**: that
specific failure means the workflow jumped straight to `./gradlew` without
running `npm install` + `npx cap sync android` first — those are what
*generate* that file from the `@capacitor/android` npm package. It's not
something to commit to git (see `.gitignore`), so it has to be
regenerated fresh on every build. The workflow in this repo already does
this correctly, in order — if you're seeing this error, diff your actual
`.github/workflows/build-apk.yml` against the one in this zip; an older
or hand-edited version that skips the sync step is almost always the
cause.

### Option B: Android Studio, on your own machine

1. Open Android Studio → **Open** → select this folder's `android/`
   subfolder (not the `android` wrapper folder itself — i.e.
   `.../android/android`).
2. Let it finish an initial Gradle sync (downloads Gradle/AGP/AndroidX —
   needs normal internet, a few minutes the first time).
3. Plug in your phone (USB debugging enabled — Settings → About Phone →
   tap "Build number" 7 times, then Settings → Developer Options → USB
   debugging), or use the AVD emulator.
4. Click **Run**. Builds, installs, and launches automatically.

Command line, once Android Studio's SDK is installed:
```bash
cd android/android
./gradlew assembleDebug
```
APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

### Why not build it here

```
$ ./gradlew assembleDebug
Downloading https://services.gradle.org/distributions/gradle-8.2.1-all.zip
Exception in thread "main" java.io.IOException: Server returned HTTP response code: 403
```
That's this sandbox's own network policy blocking the request (it only
allows a handful of package registries — npm, PyPI, GitHub — not
Android's build infrastructure), tested directly rather than assumed.
GitHub Actions runners don't have this restriction, which is the whole
reason Option A above works.

## The backend connection

`../.env.production` (repo root) already bakes in:
```
VITE_API_BASE_URL=https://new-social-2027.imrankhan210r.workers.dev/v1
```
Every build — this Android app included, since it bundles the root
project's production build — talks to that backend by default. To point
at a different backend later, edit that file, then:
```bash
cd .. && npm run build
cd android && npm run sync
```
and rebuild the APK (Option A or B above).

**One CORS step you still need to do on the backend side**: Capacitor's
Android WebView serves the bundled app from the origin `https://localhost`
(`capacitor.config.json`'s `androidScheme: "https"`) — fixed, regardless
of what device it runs on. In `../backend/wrangler.toml`:
```toml
ALLOWED_ORIGINS = "https://YOUR-VERCEL-DOMAIN.vercel.app,https://localhost"
```
then `npx wrangler deploy` from `../backend`. Without `https://localhost`
in that list, every API call from the Android app fails CORS even though
the URL itself is correct — this is the single most common thing to
forget when wrapping a web app this way. See `../docs/GO_LIVE_CHECKLIST.md`.

## Signing a release build (this is what makes updates install cleanly)

**The rule that matters more than anything else in this section: generate
the release keystore once, then reuse the exact same file and passwords
for every single build you ever produce for this app.** Android refuses
to install an update whose signing certificate doesn't match the
currently-installed app's — a different keystore on a later build isn't
a cosmetic issue, it forces every existing user to uninstall the old
version before they can take the new one. `app/build.gradle`'s
`signingConfigs.release` block and the workflow's "Configure release
signing" step both exist specifically so that never has to happen again
after the very first release build.

If you don't already have a `bharatspace-release.keystore` for this app:

```bash
keytool -genkeypair -v -keystore bharatspace-release.keystore \
  -alias bharatspace -keyalg RSA -keysize 2048 -validity 10950 \
  -storetype PKCS12
```
(10950 days ≈ 30 years — comfortably past Play Store's minimum
validity-through-2033 requirement.) Keytool will prompt for a password
and the certificate's identity fields; for a PKCS12 keystore the store
password and key password must be the same.

**Store it in exactly one of these two places, never both, never in git:**

- **Local machine / Android Studio builds** — put the keystore anywhere
  outside this repo and create `android/android/keystore.properties`
  (gitignored — see `.gitignore`) with:
  ```properties
  storeFile=/absolute/path/to/bharatspace-release.keystore
  storePassword=...
  keyAlias=bharatspace
  keyPassword=...
  ```
  `./gradlew assembleRelease` then produces a signed APK at
  `app/build/outputs/apk/release/app-release.apk` automatically — no
  Android Studio wizard needed, though **Build → Generate Signed Bundle /
  APK** also works and can point at the same file.

- **GitHub Actions** — never commit the keystore itself. Instead, add
  four repo secrets (repo → **Settings → Secrets and variables →
  Actions**):
  | Secret | Value |
  |---|---|
  | `RELEASE_KEYSTORE_BASE64` | `base64 -w0 bharatspace-release.keystore` (one line, no wrapping) |
  | `RELEASE_KEYSTORE_PASSWORD` | the store password |
  | `RELEASE_KEY_ALIAS` | `bharatspace` (or whatever alias you used) |
  | `RELEASE_KEY_PASSWORD` | the key password (same as store password for PKCS12) |

  The workflow's "Configure release signing" step decodes the base64
  secret back into a keystore file and writes the same `keystore.properties`
  format shown above, entirely inside the ephemeral runner — so the raw
  keystore never touches the repo, only GitHub's encrypted secrets store.
  If these four secrets are missing, the build still succeeds but produces
  an **unsigned** `app-release.apk` (the workflow logs a warning) rather
  than failing outright or silently falling back to a throwaway debug key.

Losing the keystore file or its passwords means you can never publish an
update to the same app identity again — Google/Android can't recover it
for you. Keep a backup (password manager, encrypted drive) outside both
this repo and any single machine.

## App identity and versioning

- Package name: `com.bharatspace.app` (`capacitor.config.json` and
  `app/build.gradle`'s `applicationId`) — permanent, already set, never
  change it. A different applicationId is a different app as far as
  Android and the Play Store are concerned, with no update path from
  this one.
- Version: `android/android/version.properties` — bump **both**
  `VERSION_CODE` (must strictly increase, every release, forever — this
  is what Android actually compares to decide "is this an update") and
  `VERSION_NAME` (the human-readable string) before every build you
  intend to distribute. See the comments in that file.

## Regenerating icons/splash later

`@capacitor/assets` isn't a persistent dependency here on purpose (its own
dependency tree pulls in `sharp` and `uuid` versions with disclosed,
unfixed vulnerabilities — harmless for a one-off local command, not worth
carrying permanently just for that). Update `assets/icon.png` etc., then
run it once via `npx` without installing it:

```bash
npx @capacitor/assets generate --android
```

## Play Store readiness

This folder produces the installable app itself. Everything else Play
Console asks for (privacy policy, data safety declarations, account
deletion, content moderation, store listing copy) is
`../docs/PLAY_STORE_CHECKLIST.md`.
