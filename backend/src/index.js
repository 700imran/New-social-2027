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

const app = new Hono()

app.use(
  '*',
  cors({
    // Set to your deployed frontend origin(s) in production — '*' is fine
    // for local development against `npm run dev` on the frontend.
    origin: ['http://localhost:5173', 'http://localhost:4173'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
  })
)

app.get('/', (c) => c.json({ name: 'bharatspace-api', status: 'ok' }))
app.get('/v1/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }))

app.route('/v1/auth', auth)
app.route('/v1', users)
app.route('/v1', follows)
app.route('/v1', consent)
app.route('/v1', media)
app.route('/v1', posts)
app.route('/v1', notifications)
app.route('/v1', campaigns)

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
