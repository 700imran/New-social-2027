import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Radio, X, Send, Users, VideoOff } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { joinLiveStream } from '../api/realtime.js'

// The viewer side of LiveGo.jsx. Deliberately shows a plain "no video
// yet" placeholder instead of anything that looks like a stalled/broken
// player — there is no video to show until a media-server piece exists
// to relay the host's camera to viewers (see LiveGo.jsx's own comment).
// Viewer count and chat are real, live, and shared with the host's
// screen right now via the same Realtime channel.
export default function LiveView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useApp()
  const [viewerCount, setViewerCount] = useState(0)
  const [chatLog, setChatLog] = useState([])
  const [chatText, setChatText] = useState('')
  const channelRef = useRef(null)

  useEffect(() => {
    channelRef.current = joinLiveStream(id, {
      onViewerCountChange: setViewerCount,
      onChat: (msg) => setChatLog((prev) => [...prev.slice(-49), msg]),
    })
    return () => channelRef.current?.leave()
  }, [id])

  const handleSendChat = (e) => {
    e.preventDefault()
    const text = chatText.trim()
    if (!text) return
    const msg = { author: currentUser.name, text }
    channelRef.current?.sendChat(msg)
    setChatLog((prev) => [...prev.slice(-49), msg])
    setChatText('')
  }

  return (
    <div className="flex h-full flex-col bg-navy-950 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-1.5 rounded-full bg-bharat-red px-2.5 py-1 text-xs font-bold">
          <Radio className="h-3 w-3" /> LIVE
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold">
          <Users className="h-4 w-4" /> {viewerCount}
        </span>
        <button onClick={() => navigate(-1)} className="rounded-full bg-white/10 p-2">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-4 flex aspect-[9/16] max-h-[45vh] flex-col items-center justify-center gap-2 rounded-2xl bg-black text-white/60">
        <VideoOff className="h-8 w-8" />
        <p className="px-6 text-center text-xs">Video isn't connected for this stream yet — chat and viewer count below are live.</p>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-4">
        {chatLog.length === 0 && <p className="text-center text-xs text-white/50">No messages yet — say hi</p>}
        {chatLog.map((m, i) => (
          <p key={i} className="mb-1.5 text-sm">
            <span className="font-semibold">{m.author}</span> <span className="text-white/80">{m.text}</span>
          </p>
        ))}
      </div>

      <form onSubmit={handleSendChat} className="flex items-center gap-2 border-t border-white/10 px-4 py-3">
        <input
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder="Say something…"
          className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white placeholder:text-white/50 focus-ring"
        />
        <button type="submit" className="rounded-full bg-saffron-500 p-2">
          <Send className="h-4 w-4 text-navy-950" />
        </button>
      </form>
    </div>
  )
}
