import { adminClient } from './supabase.js'

/**
 * Insert a notification row for `recipientId`.
 *
 * Why adminClient and not the caller's userClient: `notifications` only has
 * a SELECT policy in the Level 1 schema ("users read their own
 * notifications") — there is no INSERT policy, so a follower/commenter's
 * own RLS-scoped client is correctly forbidden from writing into someone
 * else's notifications row. The service-role client is the documented
 * escape hatch for exactly this ("admin-curated actions" in
 * lib/supabase.js) — it never touches anything the acting user's own JWT
 * wouldn't already be allowed to trigger indirectly (a follow, a comment,
 * a reaction), it just performs the fan-out write on their behalf.
 *
 * Never lets a notification failure fail the parent request — notifying
 * is a side effect, not the point of the call.
 */
export async function notify(env, { recipientId, actorId, type, text }) {
  if (!recipientId || recipientId === actorId) return // don't notify yourself
  try {
    const supabase = adminClient(env)
    await supabase.from('notifications').insert({
      recipient_id: recipientId,
      type,
      payload: { actorId, text },
    })
  } catch (err) {
    console.error('notify() failed', err)
  }
}

export function truncate(text, max = 60) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}
