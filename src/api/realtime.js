// api/realtime.js — an optional *listening* layer alongside the existing
// REST seam in api/client.js. Every read and write still goes through the
// Worker exactly as before; this only subscribes to Postgres changes over
// websocket via supabase-js's Realtime client, for the two cases that
// genuinely need a push instead of a poll: a message arriving in an open
// conversation from the other participant, and this account's settings
// changing from a *different* signed-in session/device.
//
// Needs two more env vars beyond VITE_API_BASE_URL: VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY (the public anon key — safe to expose client-side,
// same as any Supabase frontend; RLS is what actually scopes every
// subscription below, not secrecy of this key). Get both from your
// Supabase project's dashboard -> Settings -> API. Leave either unset and
// every export here becomes a no-op — same "isLive" fallback shape
// api/client.js already uses for VITE_API_BASE_URL, so a deployment that
// hasn't set these up yet just keeps working exactly as it does today
// (fetch-on-open, no push) instead of breaking.
//
// Before this can actually receive anything, two tables need Realtime
// turned on in your Supabase project — see
// docs/migrations/013_enable_realtime.sql for the one-time SQL (or the
// dashboard -> Database -> Replication toggle, same effect). Their RLS
// policies (migrations 011 and 012) already scope who can see what; this
// file doesn't add or need any new policy.
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || null
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || null
export const isRealtimeConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

const client = isRealtimeConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

// Called from api/client.js's setAccessToken so every place that already
// keeps the REST access token current (sign-in, the once-per-load
// refresh, sign-out) keeps Realtime's auth current too, with no second
// call site to remember. Falls back to the anon key (read: "no user,
// anonymous-only RLS access") on sign-out rather than leaving a stale
// token attached to the socket.
export function setRealtimeAuth(token) {
  if (!client) return
  client.realtime.setAuth(token || SUPABASE_ANON_KEY)
}

// Home.jsx's "Go Live" rail: re-fetches the active-streams list the
// instant one starts or ends anywhere, instead of only on next mount/poll.
export function subscribeToLiveStreams(onChange) {
  if (!client) return () => {}
  const channel = client
    .channel('live_streams:all')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, onChange)
    .subscribe()
  return () => client.removeChannel(channel)
}

// Subscribes to new messages landing in one open conversation. Only
// fires for the *other* participant's sends — this tab's own messages
// are already added optimistically by sendMessage() in AppContext.jsx,
// and AppContext's receiveRealtimeMessage dedupes by id regardless, so a
// redundant delivery (e.g. a brief reconnect) is harmless either way.
// Returns an unsubscribe function; safe to call even when Realtime isn't
// configured, since it just returns a no-op.
export function subscribeToMessages(conversationId, onInsert) {
  if (!client || !conversationId) return () => {}
  const channel = client
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe()
  return () => client.removeChannel(channel)
}

// Chat header's audio/video call buttons -> Call.jsx. Same
// presence-for-"is the other person here"/broadcast-for-signals
// mechanism as joinLiveStream, kept as its own export because the
// payloads mean something different (call control signals, not chat
// lines) — see Call.jsx's own comment for what this does and doesn't
// cover (peer connection/audio/video transport is not this; this is
// only "did the other participant open the same call").
export function joinCall(conversationId, { onPeerCountChange, onSignal }) {
  if (!client) return { leave: () => {}, sendSignal: () => {} }
  const channel = client.channel(`call:${conversationId}`, {
    config: { presence: { key: crypto.randomUUID() } },
  })
  channel
    .on('presence', { event: 'sync' }, () => {
      onPeerCountChange(Object.keys(channel.presenceState()).length)
    })
    .on('broadcast', { event: 'signal' }, ({ payload }) => onSignal(payload))
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ joinedAt: Date.now() })
    })
  return {
    leave: () => client.removeChannel(channel),
    sendSignal: (signal) => channel.send({ type: 'broadcast', event: 'signal', payload: signal }),
  }
}

// Live-stream viewer presence + chat. Both ephemeral by design (see
// docs/migrations/015_live_streams.sql's comment on why chat isn't a
// table) — Presence tracks who's currently in the channel for the
// viewer count, Broadcast fans out chat lines to everyone in it right
// now. Neither persists after everyone leaves, which is the right
// behavior for a live chat, not a gap.
export function joinLiveStream(streamId, { onViewerCountChange, onChat }) {
  if (!client) return { leave: () => {}, sendChat: () => {} }
  const channel = client.channel(`live:${streamId}`, {
    config: { presence: { key: crypto.randomUUID() } },
  })
  channel
    .on('presence', { event: 'sync' }, () => {
      onViewerCountChange(Object.keys(channel.presenceState()).length)
    })
    .on('broadcast', { event: 'chat' }, ({ payload }) => onChat(payload))
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track({ joinedAt: Date.now() })
    })
  return {
    leave: () => client.removeChannel(channel),
    sendChat: (message) => channel.send({ type: 'broadcast', event: 'chat', payload: message }),
  }
}

// Cross-device/cross-tab settings sync: flipping a toggle in one signed-in
// session updates every other open session for the same account within
// this subscription, instead of only on that session's next full reload.
export function subscribeToSettings(userId, onChange) {
  if (!client || !userId) return () => {}
  const channel = client
    .channel(`user_settings:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_settings', filter: `user_id=eq.${userId}` },
      (payload) => onChange(payload.new)
    )
    .subscribe()
  return () => client.removeChannel(channel)
}
