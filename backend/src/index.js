import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { timing } from 'hono/timing'
import auth from './routes/auth.js'
import users from './routes/users.js'
import follows from './routes/follows.js'
import consent from './routes/consent.js'
import media from './routes/media.js'
import posts from './routes/posts.js'
import notifications from './routes/notifications.js'
import campaigns from './routes/campaigns.js'

const app = new Hono()

// Middleware
app.use('*', timing())
app.use('*', cors({
  origin: (origin) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://new-social-2027.vercel.app',
      /\.bharatspace\.com$/
    ]
    
    for (const allowed of allowedOrigins) {
      if (typeof allowed === 'string' && origin === allowed) return allowed
      if (allowed instanceof RegExp && allowed.test(origin)) return origin
    }
    
    return null
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

// Health checks
app.get('/', (c) => c.json({ 
  name: 'bharatspace-api', 
  version: '1.0.0',
  status: 'ok',
  timestamp: new Date().toISOString()
}))

app.get('/v1/health', (c) => c.json({ 
  status: 'ok', 
  time: new Date().toISOString(),
  uptime: process.uptime()
}))

app.get('/v1/status', (c) => c.json({
  service: 'bharatspace-api',
  status: 'operational',
  region: c.req.header('cf-connecting-country') || 'unknown',
  timestamp: new Date().toISOString()
}))

// API Routes
app.route('/v1/auth', auth)
app.route('/v1', users)
app.route('/v1', follows)
app.route('/v1', consent)
app.route('/v1', media)
app.route('/v1', posts)
app.route('/v1', notifications)
app.route('/v1', campaigns)

// Error handling
app.notFound((c) => c.json({ error: 'Not found', path: c.req.path }, 404))

app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({
    error: 'Internal server error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  }, 500)
})

export default app
