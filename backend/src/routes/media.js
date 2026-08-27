import { Hono } from 'hono'
import { createR2Client, getPresignedUploadUrl, deleteR2Object, getPublicUrl } from '../lib/r2.js'

const media = new Hono()

// Validate file size and type
const validateMedia = (file, env) => {
  const maxBytes = parseInt(env.MEDIA_MAX_BYTES || '26214400', 10) // 25MB default
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
  
  if (file.size > maxBytes) {
    throw new Error(`File size exceeds maximum of ${maxBytes / 1024 / 1024}MB`)
  }
  
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`)
  }
}

// GET /v1/media/upload-url - Get presigned upload URL
media.post('/media/upload-url', async (c) => {
  try {
    const { mimeType, sizeBytes, fileName } = await c.req.json()
    
    if (!mimeType || !sizeBytes) {
      return c.json({ error: 'Missing mimeType or sizeBytes' }, 400)
    }

    const maxBytes = parseInt(c.env.MEDIA_MAX_BYTES || '26214400', 10)
    if (sizeBytes > maxBytes) {
      return c.json(
        { error: `File size exceeds maximum of ${maxBytes / 1024 / 1024}MB` },
        413
      )
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm']
    if (!allowedMimeTypes.includes(mimeType)) {
      return c.json({ error: `File type ${mimeType} not allowed` }, 415)
    }

    const r2Client = createR2Client(c.env)
    const { uploadUrl, assetId, publicUrl } = await getPresignedUploadUrl(
      r2Client,
      c.env,
      fileName || `media-${Date.now()}`,
      mimeType
    )

    return c.json({ uploadUrl, assetId, publicUrl })
  } catch (err) {
    console.error('Upload URL error:', err)
    return c.json({ error: err.message || 'Failed to generate upload URL' }, 500)
  }
})

// GET /v1/media/:id - Get media public URL
media.get('/media/:id', (c) => {
  try {
    const id = c.req.param('id')
    if (!id) {
      return c.json({ error: 'Missing media ID' }, 400)
    }

    const publicUrl = getPublicUrl(c.env, id)
    return c.json({ url: publicUrl, assetId: id })
  } catch (err) {
    console.error('Get media error:', err)
    return c.json({ error: 'Failed to retrieve media URL' }, 500)
  }
})

// DELETE /v1/media/:id - Delete media
media.delete('/media/:id', async (c) => {
  try {
    const id = c.req.param('id')
    if (!id) {
      return c.json({ error: 'Missing media ID' }, 400)
    }

    const r2Client = createR2Client(c.env)
    await deleteR2Object(r2Client, c.env, id)
    
    return c.json({ success: true, message: 'Media deleted' })
  } catch (err) {
    console.error('Delete media error:', err)
    return c.json({ error: 'Failed to delete media' }, 500)
  }
})

export default media
