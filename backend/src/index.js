import { Hono } from 'hono'
import { cors } from 'hono/cors'
import auth from './routes/auth.js'
import users from './routes/users.js'
import follows from './routes/follows.js'
import consent from './routes/consent.js'
import media from './routes/media.js'
import posts from './routes/posts.js'
import notifications from './routes/notifications.js'
import campaigns from './routes/campaigns.js'
import account from './routes/account.js'
import reports from './routes/reports.js'
import admin from './routes/admin.js'

const app = new Hono()

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://localhost',
]

app.use('*', async (c, next) => {
  const configured = (c.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  const origins = configured.length ? configured : DEFAULT_ORIGINS

  return cors({
    origin: origins,
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })(c, next)
})

// Security headers
app.use('*', async (c, next) => {
  await next()

  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )
  c.header('Cross-Origin-Resource-Policy', 'cross-origin')
})

// Maximum JSON request body size: 100 KB
const MAX_JSON_BODY_BYTES = 100 * 1024

app.use('*', async (c, next) => {
  const len = Number(c.req.header('Content-Length') || 0)

  if (len > MAX_JSON_BODY_BYTES) {
    return c.json({ error: 'Request body too large' }, 413)
  }

  await next()
})

// API root
app.get('/v1', (c) =>
  c.json({
    name: 'bharatspace-api',
    version: 'v1',
    status: 'ok',
  })
)

// Health check
app.get('/v1/health', (c) =>
  c.json({
    status: 'ok',
    time: new Date().toISOString(),
  })
)

// Root endpoint
app.get('/', (c) =>
  c.json({
    name: 'bharatspace-api',
    status: 'ok',
  })
)

// API routes
app.route('/v1/auth', auth)
app.route('/v1', users)
app.route('/v1', follows)
app.route('/v1', consent)
app.route('/v1', media)
app.route('/v1', posts)
app.route('/v1', notifications)
app.route('/v1', campaigns)
app.route('/v1', account)
app.route('/v1', reports)
app.route('/v1', admin)

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Global error handler
app.onError((err, c) => {
  console.error(err)

  return c.json(
    {
      error: 'Internal server error',
    },
    500
  )
})

export default app
