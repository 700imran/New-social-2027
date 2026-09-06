// lib/errorHandler.js — the one place that decides what a failed DB call
// tells the frontend.
//
// Supabase-js calls in this codebase don't throw on failure — they resolve
// with `{ data, error }`. That means Hono's `app.onError()` (in index.js)
// never sees these; it only catches *thrown* exceptions. Every route that
// checks `if (error) return c.json(...)` has to go through this helper
// instead, or the real Postgres/PostgREST message (column names, RLS
// policy text, constraint names) goes straight to the browser.
//
// Usage: `if (error) return dbError(c, error)` for a generic message, or
// `if (error) return dbError(c, error, 'Could not post your comment')` when
// a route-specific message reads better than the default.
export function dbError(c, error, publicMessage = 'Something went wrong. Please try again.', status = 400) {
  console.error(`[DB_ERROR] ${c.req.method} ${c.req.path}`, error?.message || error)
  return c.json({ error: publicMessage }, status)
}
