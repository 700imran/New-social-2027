import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth, optionalAuth } from '../lib/authMiddleware.js'
import { checkRateLimit } from '../lib/security.js'
import { r2Client, r2Endpoint } from '../lib/r2.js'

const media = new Hono()

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])

// POST /v1/media/upload-url  { mimeType, sizeBytes }
// -> { assetId, uploadUrl, expiresIn }
//
// Per the guideline: the Worker never touches file bytes (10ms CPU budget).
// It validates the *declared* size/type server-side, writes a media_assets
// row, and hands back a short-lived presigned PUT URL straight to R2.
// The browser then uploads directly to that URL, bypassing this Worker.
media.post('/media/upload-url', requireAuth, async (c) => {
  const rate = await checkRateLimit(c.env, 'MEDIA_RATE_LIMITER', c.get('userId'))
  if (!rate.allowed) return c.json({ error: 'Too many uploads — please slow down.' }, 429)

  const { mimeType, sizeBytes } = await c.req.json().catch(() => ({}))
  const maxBytes = Number(c.env.MEDIA_MAX_BYTES || 26214400)

  if (!ALLOWED_MIME.has(mimeType)) {
    return c.json({ error: `Unsupported mimeType. Allowed: ${[...ALLOWED_MIME].join(', ')}` }, 400)
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > maxBytes) {
    return c.json({ error: `sizeBytes must be between 1 and ${maxBytes}` }, 400)
  }

  const userId = c.get('userId')
  const ext = mimeType.split('/')[1]
  const storageKey = `${userId}/${crypto.randomUUID()}.${ext}`

  const supabase = userClient(c.env, c.get('jwt'))
  const { data: asset, error } = await supabase
    .from('media_assets')
    .insert({ owner_id: userId, storage_key: storageKey, mime_type: mimeType, size_bytes: sizeBytes })
    .select('id')
    .single()
  if (error) return dbError(c, error)

  const r2 = r2Client(c.env)
  const endpoint = r2Endpoint(c.env, storageKey)
  const expiresIn = 300 // 5 minutes, per the guideline: "expire in minutes, not hours"

  const signed = await r2.sign(
    new Request(endpoint, { method: 'PUT', headers: { 'Content-Type': mimeType } }),
    { aws: { signQuery: true }, expires: expiresIn }
  )

  return c.json({ assetId: asset.id, uploadUrl: signed.url, expiresIn })
})

// GET /v1/media/:id -> { url, mimeType, renditionStrategy }
//
// This *is* MediaService.getPlaybackUrl(assetId) from the guideline: today
// it builds a single public R2 URL from storage_key. When the full Media
// Engine (Master Roadmap Phase 6) exists, this same function starts reading
// the `renditions` JSONB column instead and returns an adaptive manifest —
// callers of this endpoint never change.
media.get('/media/:id', optionalAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt') || c.env.SUPABASE_ANON_KEY)
  const { data: asset, error } = await supabase
    .from('media_assets')
    .select('storage_key, mime_type, rendition_strategy, renditions')
    .eq('id', c.req.param('id'))
    .single()
  if (error) return dbError(c, error, 'Not found', 404)

  if (asset.rendition_strategy === 'adaptive' && Object.keys(asset.renditions || {}).length) {
    return c.json({ renditions: asset.renditions, mimeType: asset.mime_type, renditionStrategy: 'adaptive' })
  }

  return c.json({
    url: `${c.env.R2_PUBLIC_BASE_URL}/${asset.storage_key}`,
    mimeType: asset.mime_type,
    renditionStrategy: asset.rendition_strategy,
  })
})

export default media
