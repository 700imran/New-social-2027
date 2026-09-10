import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, X, Send, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'
import * as api from '../api/client.js'
import { isLive } from '../api/client.js'
import { joinLiveStream } from '../api/realtime.js'

// Home.jsx's "Go Live" card -> here. What's real: the session row
// (docs/migrations/015_live_streams.sql — shows up for every viewer the
// moment you start, disappears the moment you end), the live viewer
// count and chat below (Supabase Realtime Presence/Broadcast, no polling).
// What's a local preview only: the camera feed — getUserMedia shows it
// to *you* so this screen isn't a blank box, but nothing is sent to
// anyone else. Actually delivering that feed to viewers needs a WebRTC
// signaling/media-server piece this doesn't build, so LiveView.jsx (the
// viewer's screen) says so plainly instead of showing a fake video.
export default function LiveGo() {
  const navigate = useNavigate()
  const { currentUser, pushToast } = useApp()
  const [title, setTitle] = useState('')
  const [streamId, setStreamId] = useState(null)
  const [starting, setStarting] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [chatLog, setChatLog] = useState([])
  const [chatText, setChatText] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const liveChannelRef = useRef(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      liveChannelRef.current?.leave()
    }
  }, [])

  const handleStart = async () => {
    if (!title.trim()) {
      pushToast('Give your stream a title first')
      return
    }
    setStarting(true)
    try {
      let id = `local-${Date.now()}`
      if (isLive) {
        const res = await api.startLiveStream(title.trim())
        id = res.id
      }
      setStreamId(id)
      liveChannelRef.current = joinLiveStream(id, {
        onViewerCountChange: setViewerCount,
        onChat: (msg) => setChatLog((prev) => [...prev.slice(-49), msg]),
      })
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        pushToast('Camera/mic permission denied — you can still chat, but there\u2019s no preview')
      }
    } catch (err) {
      pushToast(err.message || 'Could not start your stream — please try again.')
    } finally {
      setStarting(false)
    }
  }

  const handleEnd = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    liveChannelRef.current?.leave()
    if (isLive && streamId && !streamId.startsWith('local-')) {
      api.endLiveStream(streamId).catch(() => {})
    }
    navigate('/home')
  }

  const handleSendChat = (e) => {
    e.preventDefault()
    const text = chatText.trim()
    if (!text) return
    const msg = { author: currentUser.name, text }
    liveChannelRef.current?.sendChat(msg)
    setChatLog((prev) => [...prev.slice(-49), msg])
    setChatText('')
  }

  if (!streamId) {
    return (
      <div>
        <PageHeader title="Go Live" showBack />
        <div className="p-4">
          <label className="text-sm font-semibold text-ink-900">What are you going live about?</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="Give your stream a title"
            className="mt-2 w-full rounded-xl border border-ink-200 px-3.5 py-3 text-sm focus-ring"
            autoFocus
          />
          <p className="mt-3 text-xs text-ink-500">
            Once you start, this shows up live on everyone's Home feed with real viewer count and chat.
          </p>
          <button
            onClick={handleStart}
            disabled={starting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-bharat-red px-6 py-3.5 font-display text-[15px] font-bold text-white shadow-pop transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <Radio className="h-4 w-4" /> {starting ? 'Starting…' : 'Go Live'}
          </button>
        </div>
      </div>
    )
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
        <button onClick={handleEnd} className="rounded-full bg-white/10 p-2">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mx-4 aspect-[9/16] max-h-[45vh] overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        <p className="absolute bottom-2 left-2 right-2 text-center text-[10px] text-white/70">
          Preview only — video isn't sent to viewers yet (needs a media server)
        </p>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-4">
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
