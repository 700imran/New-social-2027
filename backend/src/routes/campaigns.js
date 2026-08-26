import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { requireAuth } from '../lib/authMiddleware.js'

// Model 2 — Creator–Brand Commerce. Schema exists from day 1 (see the .sql
// file: brands, campaigns, creator_offers, deliverables, transactions) but
// per the guideline this stays "reserved, not fully wired" until Level 1's
// social core is proven. Basic CRUD is implemented so brand-side testing
// can start; matching/payouts stay stubbed behind MatchingService.

const campaigns = new Hono()

campaigns.post('/campaigns', requireAuth, async (c) => {
  const { brandId, title, budget, requirements } = await c.req.json()
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ brand_id: brandId, title, budget, requirements: requirements || {} })
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

campaigns.get('/campaigns/:id', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase.from('campaigns').select('*').eq('id', c.req.param('id')).single()
  if (error) return c.json({ error: error.message }, 404)
  return c.json(data)
})

campaigns.post('/campaigns/:id/offers', requireAuth, async (c) => {
  const { creatorId } = await c.req.json()
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('creator_offers')
    .insert({ campaign_id: c.req.param('id'), creator_id: creatorId })
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

campaigns.patch('/offers/:id', requireAuth, async (c) => {
  const { status } = await c.req.json() // 'accepted' | 'declined'
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('creator_offers')
    .update({ status })
    .eq('id', c.req.param('id'))
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

campaigns.post('/deliverables', requireAuth, async (c) => {
  const { offerId, mediaAssetId } = await c.req.json()
  const supabase = userClient(c.env, c.get('jwt'))
  const { data, error } = await supabase
    .from('deliverables')
    .insert({ offer_id: offerId, media_asset_id: mediaAssetId })
    .select()
    .single()
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

// Matches the guideline exactly: "returns 'coming soon' until Phase 8/P2".
// This is MatchingService.suggestCreators()'s seam — the frontend contract
// never changes when the real scored/automated engine replaces this.
campaigns.get('/campaigns/:id/performance', requireAuth, async (c) => {
  return c.json({ status: 'coming soon', message: 'Campaign performance analytics ship in a later phase.' })
})

export default campaigns
