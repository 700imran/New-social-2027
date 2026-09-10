import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth } from '../lib/authMiddleware.js'

const insights = new Hono()

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

async function myPostIds(supabase, userId) {
  const { data } = await supabase.from('posts').select('id').eq('author_id', userId)
  return (data || []).map((p) => p.id)
}

// GET /v1/insights/overview — Settings -> Your Insights -> Overview.
// Every number here is a real aggregate over this account's own rows
// (posts/reactions/comments/follows) computed at request time — nothing
// is tracked or stored separately for this, so there is no separate
// "insights" table to keep in sync.
insights.get('/insights/overview', requireAuth, async (c) => {
  const userId = c.get('userId')
  const supabase = userClient(c.env, c.get('jwt'))
  const postIds = await myPostIds(supabase, userId)
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString()

  const [followers, following, likes, comments, newFollowers] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', userId),
    supabase.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', userId),
    postIds.length
      ? supabase.from('reactions').select('post_id', { count: 'exact', head: true }).in('post_id', postIds)
      : Promise.resolve({ count: 0 }),
    postIds.length
      ? supabase.from('comments').select('post_id', { count: 'exact', head: true }).in('post_id', postIds)
      : Promise.resolve({ count: 0 }),
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('followee_id', userId)
      .gte('created_at', weekAgo),
  ])

  return c.json({
    postCount: postIds.length,
    followerCount: followers.count || 0,
    followingCount: following.count || 0,
    totalLikes: likes.count || 0,
    totalComments: comments.count || 0,
    newFollowersThisWeek: newFollowers.count || 0,
  })
})

// GET /v1/insights/content — per-post breakdown, most-engaged first.
insights.get('/insights/content', requireAuth, async (c) => {
  const userId = c.get('userId')
  const supabase = userClient(c.env, c.get('jwt'))
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, body, created_at')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) return dbError(c, error, 'Could not load content insights', 500)
  if (!posts?.length) return c.json({ posts: [] })

  const postIds = posts.map((p) => p.id)
  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabase.from('reactions').select('post_id').in('post_id', postIds),
    supabase.from('comments').select('post_id').in('post_id', postIds),
  ])
  const likeCounts = {}
  ;(reactions || []).forEach((r) => (likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1))
  const commentCounts = {}
  ;(comments || []).forEach((cm) => (commentCounts[cm.post_id] = (commentCounts[cm.post_id] || 0) + 1))

  const enriched = posts
    .map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.created_at,
      likeCount: likeCounts[p.id] || 0,
      commentCount: commentCounts[p.id] || 0,
    }))
    .sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))

  return c.json({ posts: enriched })
})

// GET /v1/insights/audience — follower/following counts plus a real
// weekly new-follower trend (follows.created_at, grouped in JS since
// this is a handful of rows per account, not worth a DB-side date_trunc).
insights.get('/insights/audience', requireAuth, async (c) => {
  const userId = c.get('userId')
  const supabase = userClient(c.env, c.get('jwt'))
  const sixWeeksAgo = new Date(Date.now() - 6 * WEEK_MS).toISOString()

  const [followers, following, { data: recentFollows }] = await Promise.all([
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', userId),
    supabase.from('follows').select('followee_id', { count: 'exact', head: true }).eq('follower_id', userId),
    supabase.from('follows').select('created_at').eq('followee_id', userId).gte('created_at', sixWeeksAgo),
  ])

  const weeks = Array.from({ length: 6 }, (_, i) => {
    const start = Date.now() - (6 - i) * WEEK_MS
    return { weekStart: new Date(start).toISOString(), count: 0 }
  })
  ;(recentFollows || []).forEach((f) => {
    const t = new Date(f.created_at).getTime()
    const idx = weeks.findIndex((w, i) => t >= new Date(w.weekStart).getTime() && (i === weeks.length - 1 || t < new Date(weeks[i + 1].weekStart).getTime()))
    if (idx >= 0) weeks[idx].count += 1
  })

  return c.json({
    followerCount: followers.count || 0,
    followingCount: following.count || 0,
    weeklyNewFollowers: weeks,
  })
})

// GET /v1/insights/discovery — "Recommendations insights": how much of
// this account's engagement comes from people who don't already follow
// them, computed from real reaction/comment authorship vs. the follows
// table (no separate impression/view tracking exists, so this is the
// honest signal available today — see docs/migrations for what would be
// needed to add reach/impressions on top of this later).
insights.get('/insights/discovery', requireAuth, async (c) => {
  const userId = c.get('userId')
  const supabase = userClient(c.env, c.get('jwt'))
  const postIds = await myPostIds(supabase, userId)
  if (!postIds.length) return c.json({ followerEngagement: 0, nonFollowerEngagement: 0 })

  const [{ data: reactions }, { data: comments }] = await Promise.all([
    supabase.from('reactions').select('user_id').in('post_id', postIds),
    supabase.from('comments').select('author_id').in('post_id', postIds),
  ])
  const engagerIds = [...new Set([...(reactions || []).map((r) => r.user_id), ...(comments || []).map((cm) => cm.author_id)])]
  if (!engagerIds.length) return c.json({ followerEngagement: 0, nonFollowerEngagement: 0 })

  const { data: followerMatches } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('followee_id', userId)
    .in('follower_id', engagerIds)
  const followerEngagement = followerMatches?.length || 0

  return c.json({
    followerEngagement,
    nonFollowerEngagement: engagerIds.length - followerEngagement,
  })
})

export default insights
