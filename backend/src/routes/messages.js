import { Hono } from 'hono'
import { userClient } from '../lib/supabase.js'
import { dbError } from '../lib/errorHandler.js'
import { requireAuth } from '../lib/authMiddleware.js'
import { checkRateLimit, requireText, LIMITS } from '../lib/security.js'

const messages = new Hono()

// Turns a bare storage_key into the public R2 URL — same helper as
// enrichPosts() in routes/posts.js, duplicated locally rather than
// imported since posts.js doesn't export it (matches this codebase's
// existing per-route-file convention).
function publicMediaUrl(env, storageKey) {
  return storageKey ? `${env.R2_PUBLIC_BASE_URL}/${storageKey}` : null
}

// conversations.user_one_id is always the smaller uuid (see
// migrations/012_direct_messages.sql's check constraint) — every route
// below normalizes order before insert/select so a lookup never has to
// try both orderings.
function orderedPair(a, b) {
  return a < b ? [a, b] : [b, a]
}

function otherParticipant(conversation, myId) {
  return conversation.user_one_id === myId ? conversation.user_two_id : conversation.user_one_id
}

async function enrichConversations(supabase, env, rows, myId) {
  if (!rows.length) return []
  const otherIds = [...new Set(rows.map((r) => otherParticipant(r, myId)))]
  const convoIds = rows.map((r) => r.id)

  const [profilesRes, lastMsgRes, readsRes] = await Promise.all([
    supabase.from('profiles').select('user_id, display_name, avatar_asset_id').in('user_id', otherIds),
    // One row per conversation would be nicer as a DB view, but Level 1
    // keeps schema surface minimal (see the migration's own notes) — this
    // pulls the last message per conversation with a bounded query
    // instead of a join, same trade-off enrichPosts() already makes.
    supabase
      .from('messages')
      .select('conversation_id, id, sender_id, body, shared_post_id, created_at')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false }),
    supabase.from('conversation_reads').select('conversation_id, last_read_at').eq('user_id', myId).in('conversation_id', convoIds),
  ])

  const avatarAssetIds = (profilesRes.data || []).filter((p) => p.avatar_asset_id).map((p) => p.avatar_asset_id)
  const avatarRes = avatarAssetIds.length
    ? await supabase.from('media_assets').select('id, storage_key').in('id', avatarAssetIds)
    : { data: [] }
  const mediaById = Object.fromEntries((avatarRes.data || []).map((m) => [m.id, m]))
  const profileById = Object.fromEntries((profilesRes.data || []).map((p) => [p.user_id, p]))
  const readAtByConvo = Object.fromEntries((readsRes.data || []).map((r) => [r.conversation_id, r.last_read_at]))

  const toAuthorFragment = (userId) => {
    const profile = profileById[userId]
    return profile
      ? {
          id: userId,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_asset_id ? publicMediaUrl(env, mediaById[profile.avatar_asset_id]?.storage_key) : null,
        }
      : { id: userId, displayName: 'BharatSpace user', avatarUrl: null }
  }

  return rows
    .map((convo) => {
      const otherId = otherParticipant(convo, myId)
      const convoMessages = (lastMsgRes.data || []).filter((m) => m.conversation_id === convo.id)
      const lastMessage = convoMessages[0] || null
      const readAt = readAtByConvo[convo.id]
      const unreadCount = convoMessages.filter(
        (m) => m.sender_id !== myId && (!readAt || new Date(m.created_at) > new Date(readAt))
      ).length

      return {
        id: convo.id,
        otherUser: toAuthorFragment(otherId),
        lastMessage: lastMessage
          ? { body: lastMessage.body, sharedPost: !!lastMessage.shared_post_id, createdAt: lastMessage.created_at }
          : null,
        unreadCount,
        updatedAt: convo.last_message_at,
      }
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

// GET /v1/conversations — every 1:1 thread the caller is part of, newest
// activity first, each with the other participant's profile fragment,
// last-message preview, and unread count.
messages.get('/conversations', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const myId = c.get('userId')
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user_one_id.eq.${myId},user_two_id.eq.${myId}`)
  if (error) return dbError(c, error)

  const enriched = await enrichConversations(supabase, c.env, data, myId)
  return c.json(enriched)
})

// POST /v1/conversations  { userId } — get-or-create the 1:1 conversation
// with `userId`. Blocked in either direction the same way follows.js
// blocks a new follow: a conversation can't be *created* across a block,
// but an existing one (from before the block) isn't retroactively hidden
// by this check — RLS's participant-only policy still gates all reads.
messages.post('/conversations', requireAuth, async (c) => {
  const myId = c.get('userId')
  const { userId } = await c.req.json().catch(() => ({}))
  if (!userId) return c.json({ error: 'userId is required' }, 400)
  if (userId === myId) return c.json({ error: "You can't message yourself" }, 400)

  const supabase = userClient(c.env, c.get('jwt'))

  const { data: blockRows } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id')
    .or(`and(blocker_id.eq.${myId},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${myId})`)
  if (blockRows && blockRows.length > 0) {
    return c.json({ error: 'Unable to message this account' }, 403)
  }

  const [userOneId, userTwoId] = orderedPair(myId, userId)

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_one_id', userOneId)
    .eq('user_two_id', userTwoId)
    .maybeSingle()
  if (existing) {
    const [enriched] = await enrichConversations(supabase, c.env, [existing], myId)
    return c.json(enriched)
  }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_one_id: userOneId, user_two_id: userTwoId })
    .select()
    .single()
  if (error) return dbError(c, error, 'Could not start this conversation')

  const [enriched] = await enrichConversations(supabase, c.env, [created], myId)
  return c.json(enriched, 201)
})

// Shared by the two routes below — confirms the conversation exists and
// the caller is one of its two participants, returning a 404 either way
// (never a 403) so a stranger probing conversation ids can't tell "not
// yours" apart from "doesn't exist."
async function loadOwnConversation(supabase, conversationId, myId) {
  const { data, error } = await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle()
  if (error || !data) return null
  if (data.user_one_id !== myId && data.user_two_id !== myId) return null
  return data
}

// GET /v1/conversations/:id/messages?before=<iso>&limit=30 — same cursor
// pagination convention as GET /posts.
messages.get('/conversations/:id/messages', requireAuth, async (c) => {
  const myId = c.get('userId')
  const supabase = userClient(c.env, c.get('jwt'))
  const conversation = await loadOwnConversation(supabase, c.req.param('id'), myId)
  if (!conversation) return c.json({ error: 'Conversation not found' }, 404)

  const before = c.req.query('before')
  const limit = Number(c.req.query('limit') || 50)
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) query = query.lt('created_at', before)
  const { data, error } = await query
  if (error) return dbError(c, error)

  // Returned oldest-first (the order a chat thread renders top to
  // bottom) even though the query above fetches newest-first (so the
  // `limit` + `before` cursor grabs the most RECENT page, not the
  // oldest) — same "fetch newest, display oldest-first" shape as any
  // reverse-infinite-scroll chat UI.
  return c.json(data.reverse())
})

// POST /v1/conversations/:id/messages  { body?, sharedPostId? } — at
// least one of the two is required (see the messages_has_content check
// constraint). Reuses WRITE_RATE_LIMITER rather than a dedicated
// messaging limiter — one fewer binding to add to wrangler.toml for a
// zero-cost deploy, and 20/min is already generous for a real
// conversation's pace.
messages.post('/conversations/:id/messages', requireAuth, async (c) => {
  const myId = c.get('userId')
  const rate = await checkRateLimit(c.env, 'WRITE_RATE_LIMITER', myId)
  if (!rate.allowed) return c.json({ error: 'You are sending messages too quickly — please slow down.' }, 429)

  const supabase = userClient(c.env, c.get('jwt'))
  const conversation = await loadOwnConversation(supabase, c.req.param('id'), myId)
  if (!conversation) return c.json({ error: 'Conversation not found' }, 404)

  const { body, sharedPostId } = await c.req.json().catch(() => ({}))
  let text = { value: null }
  if (body) {
    text = requireText(body, { field: 'body', max: LIMITS.commentBody, required: false })
    if (text.error) return c.json({ error: text.error }, 400)
  }
  if (!text.value && !sharedPostId) {
    return c.json({ error: 'A message needs text or a shared post' }, 400)
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      sender_id: myId,
      body: text.value || null,
      shared_post_id: sharedPostId || null,
    })
    .select()
    .single()
  if (error) return dbError(c, error, 'Could not send your message')

  await supabase.from('conversations').update({ last_message_at: data.created_at }).eq('id', conversation.id)
  // Sending counts as having read up to your own message — otherwise
  // your own outgoing message would immediately count toward your own
  // unread badge.
  await supabase
    .from('conversation_reads')
    .upsert({ conversation_id: conversation.id, user_id: myId, last_read_at: data.created_at }, { onConflict: 'conversation_id,user_id' })

  return c.json(data, 201)
})

// DELETE /v1/messages/:id — the message's own sender only (RLS backs
// this up; a delete that matches no row is reported as 404, same
// pattern as DELETE /posts/:postId/comments/:commentId).
messages.delete('/messages/:id', requireAuth, async (c) => {
  const supabase = userClient(c.env, c.get('jwt'))
  const { error, count } = await supabase
    .from('messages')
    .delete({ count: 'exact' })
    .eq('id', c.req.param('id'))
    .eq('sender_id', c.get('userId'))
  if (error) return dbError(c, error)
  if (!count) return c.json({ error: "Message not found, or you don't have permission to delete it" }, 404)
  return c.json({ ok: true })
})

// POST /v1/conversations/:id/read — mark everything in this thread read
// up to now. Called when ChatThread.jsx opens/comes back into focus.
messages.post('/conversations/:id/read', requireAuth, async (c) => {
  const myId = c.get('userId')
  const supabase = userClient(c.env, c.get('jwt'))
  const conversation = await loadOwnConversation(supabase, c.req.param('id'), myId)
  if (!conversation) return c.json({ error: 'Conversation not found' }, 404)

  const { error } = await supabase
    .from('conversation_reads')
    .upsert(
      { conversation_id: conversation.id, user_id: myId, last_read_at: new Date().toISOString() },
      { onConflict: 'conversation_id,user_id' }
    )
  if (error) return dbError(c, error)
  return c.json({ ok: true })
})

export default messages
