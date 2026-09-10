import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Send, Trash2, Phone, Video } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useKeyboardInset } from '../utils/useKeyboardInset.js'

// The actual chat screen — reached two ways: Messages.jsx's list (tap a
// conversation) and Profile.jsx's Message button
// (navigate(`/messages/${targetId}`), a user id, not a conversation id —
// that's why the route below is /messages/:userId and this component
// resolves-or-creates the conversation itself on mount, rather than
// requiring a conversation id to already exist before the screen can
// open).
export default function ChatThread() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const {
    getUser,
    currentUser,
    posts,
    getOrCreateConversation,
    loadMessages,
    messagesByConversation,
    sendMessage,
    deleteMessage,
    markConversationRead,
    fetchPostById,
  } = useApp()

  const [conversation, setConversation] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [resolveFailed, setResolveFailed] = useState(false)
  const [text, setText] = useState('')
  const [openMenuId, setOpenMenuId] = useState(null)
  const scrollRef = useRef(null)
  const otherUser = getUser(userId)
  const keyboardInset = useKeyboardInset()

  useEffect(() => {
    let cancelled = false
    setResolving(true)
    setResolveFailed(false)
    getOrCreateConversation(userId)
      .then((convo) => {
        if (cancelled) return
        setConversation(convo)
        loadMessages(convo.id)
        markConversationRead(convo.id)
      })
      .catch((err) => {
        console.error('[ChatThread] could not open this conversation', err)
        if (!cancelled) setResolveFailed(true)
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const messages = conversation ? messagesByConversation[conversation.id] || [] : []

  // A shared-post message only carries an id (see
  // migrations/012_direct_messages.sql) — most of the time the post is
  // already in `posts` from the sender's own feed/reel, but for the
  // recipient it may not be, so this resolves each one exactly like a
  // real deep link would (fetchPostById hits the network only for an
  // actual miss; every other message here is a no-op lookup).
  useEffect(() => {
    const missingIds = [...new Set(messages.filter((m) => m.sharedPostId).map((m) => m.sharedPostId))].filter(
      (id) => !posts.some((p) => p.id === id)
    )
    missingIds.forEach((id) => fetchPostById(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, fetchPostById])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length, keyboardInset])

  const handleSend = (e) => {
    e.preventDefault()
    if (!text.trim() || !conversation) return
    sendMessage(conversation.id, { text })
    setText('')
  }

  const handleDelete = (messageId) => {
    if (!conversation) return
    deleteMessage(conversation.id, messageId)
    setOpenMenuId(null)
  }

  if (resolveFailed) {
    return (
      <div>
        <PageHeader title="Message" showBack />
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-ink-500">Couldn't open this conversation — please try again.</p>
          <button onClick={() => navigate('/messages')} className="mt-3 text-sm font-semibold text-saffron-600">
            Back to Messages
          </button>
        </div>
      </div>
    )
  }

  return (
    // `h-full` — same reasoning as the Reels.jsx layout fix: the
    // AppLayout <Outlet/> wrapper this renders into already resolves to
    // a definite height that excludes the space reserved for BottomNav
    // (see that file's comment), so a child asking for 100% of it lands
    // exactly at "the visible area above the nav" without hardcoding a
    // second copy of that math here.
    <div
      // At rest this already sits correctly (h-full resolves to the
      // space AppLayout reserves above BottomNav — see the comment
      // above). When Gboard opens, `keyboardInset` shifts the whole
      // column up by exactly its height so the message input ends up
      // resting on top of the keyboard instead of being hidden under
      // it; it settles back to its normal spot the instant the
      // keyboard closes and `keyboardInset` returns to 0.
      className="flex h-full flex-col transition-transform duration-150"
      style={{ transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : 'none' }}
    >
      <PageHeader
        title={
          <button
            onClick={() => otherUser && navigate(otherUser.id === currentUser.id ? '/profile' : `/profile/${otherUser.id}`)}
            className="flex items-center gap-2 text-left"
          >
            {otherUser && <Avatar user={otherUser} size="xs" showVerified={false} />}
            <span className="text-base font-semibold text-ink-900">{otherUser?.name || 'Chat'}</span>
          </button>
        }
        showBack
        right={
          conversation && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => otherUser && navigate(`/call/${conversation.id}/audio?peer=${otherUser.id}`)}
                className="focus-ring rounded-full p-2 text-ink-700 transition-transform active:scale-90"
                aria-label="Audio call"
              >
                <Phone className="h-5 w-5" />
              </button>
              <button
                onClick={() => otherUser && navigate(`/call/${conversation.id}/video?peer=${otherUser.id}`)}
                className="focus-ring rounded-full p-2 text-ink-700 transition-transform active:scale-90"
                aria-label="Video call"
              >
                <Video className="h-5 w-5" />
              </button>
            </div>
          )
        }
      />

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {resolving ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`skeleton h-9 w-40 rounded-2xl ${i % 2 ? 'ml-auto' : ''}`} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">
            {otherUser ? `Say hello to ${otherUser.name} 👋` : 'Say hello 👋'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const isMe = m.senderId === currentUser.id
              const sharedPost = m.sharedPostId ? posts.find((p) => p.id === m.sharedPostId) : null
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {m.sharedPostId ? (
                    <button
                      onClick={() => sharedPost && navigate(`/post/${sharedPost.id}`)}
                      onContextMenu={(e) => { if (isMe) { e.preventDefault(); setOpenMenuId(m.id) } }}
                      className={`max-w-[78%] overflow-hidden rounded-2xl border text-left ${
                        isMe ? 'border-saffron-200 bg-saffron-50' : 'border-ink-100 bg-white'
                      }`}
                    >
                      {sharedPost ? (
                        <div className="p-2.5">
                          <p className="text-[11px] font-semibold text-ink-500">Shared post</p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-ink-900">{sharedPost.text}</p>
                        </div>
                      ) : (
                        <p className="px-3 py-2.5 text-sm italic text-ink-500">Post no longer available</p>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => isMe && setOpenMenuId((id) => (id === m.id ? null : m.id))}
                      onContextMenu={(e) => { if (isMe) { e.preventDefault(); setOpenMenuId(m.id) } }}
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-left text-sm ${
                        isMe ? 'bg-saffron-gradient text-white' : 'bg-ink-100 text-ink-900'
                      }`}
                    >
                      {m.text}
                    </button>
                  )}
                  {openMenuId === m.id && isMe && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="focus-ring mt-1 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-bharat-red shadow"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                  <span className="mt-0.5 text-[10px] text-ink-400">{m.time}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="flex shrink-0 items-center gap-2 border-t border-ink-100 bg-white px-3 py-2.5 pb-[max(env(safe-area-inset-bottom),10px)]"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          disabled={resolving}
          className="flex-1 rounded-full bg-ink-100 px-4 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!text.trim() || resolving}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-gradient text-white shadow-pop disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
