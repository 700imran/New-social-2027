import { Hono } from 'hono'
import { optionalAuth } from '../lib/authMiddleware.js'
import { checkRateLimit, clientKey, requireText, LIMITS } from '../lib/security.js'

const translate = new Hono()

// A short allow-list rather than accepting any string for targetLang —
// keeps this endpoint from being usable as an open, unrestricted proxy.
// Extend freely; it only gates which `tl=` value is forwarded upstream.
const SUPPORTED_LANGS = new Set([
  'en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur',
  'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'zh', 'zh-CN', 'ja', 'ko', 'id',
])

// POST /v1/translate  { text, targetLang }
//
// Comment/post "Translate" button hits this instead of calling a
// third-party service straight from the browser: keeps the upstream URL
// (and whichever provider it becomes) out of frontend code, sidesteps any
// CORS surprises once the app is served from its real origin, and gives
// every caller — signed in or not — the same shared, IP/user-keyed rate
// limit `checkRateLimit` already uses everywhere else (see
// lib/security.js). `optionalAuth` rather than `requireAuth`: translating
// a comment you can already read shouldn't require signing in.
//
// Uses Google's public, keyless `translate_a/single` endpoint — the same
// one Chrome's built-in page-translate feature calls. It has no SLA and
// no official support, which is fine for a demo/MVP but not something to
// depend on at real volume. Swapping in a paid, documented provider
// (Cloud Translation API, DeepL, Azure Translator) later is a one-line
// change: replace the `fetch(url)` below with that provider's call and
// keep this function's request/response shape the same — nothing calling
// `POST /translate` needs to change.
translate.post('/translate', optionalAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', c.get('userId') || clientKey(c))
  if (!rate.allowed) return c.json({ error: 'Please slow down.' }, 429)

  const { text, targetLang } = await c.req.json().catch(() => ({}))
  const checked = requireText(text, { field: 'text', max: LIMITS.commentBody })
  if (checked.error) return c.json({ error: checked.error }, 400)
  const lang = SUPPORTED_LANGS.has(targetLang) ? targetLang : 'en'

  try {
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(checked.value)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`upstream responded ${res.status}`)
    const data = await res.json()
    // Response shape is a loosely-typed nested array: data[0] is a list of
    // [translatedChunk, originalChunk, ...] pairs (one per sentence the
    // upstream split the input into) and data[2] is the detected source
    // language code — everything else in the payload is undocumented and
    // unused here.
    const translatedText = (data?.[0] || []).map((chunk) => chunk?.[0] || '').join('')
    const detectedLang = typeof data?.[2] === 'string' ? data[2] : null

    if (!translatedText) throw new Error('empty translation from upstream')
    return c.json({ translatedText, detectedLang, targetLang: lang })
  } catch (err) {
    console.error('[translate] upstream request failed', err)
    return c.json({ error: 'Translation is temporarily unavailable — please try again.' }, 502)
  }
})

export default translate
