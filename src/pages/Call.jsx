import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, Users } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { joinCall } from '../api/realtime.js'

// ChatThread.jsx's audio/video call buttons -> here (/call/:conversationId/:mode).
// What's real: local mic/camera preview and permission handling, a
// Realtime presence check for whether the other participant has also
// opened this call (peerCount), and a broadcast "hangup" signal so
// either side ending the call closes it for both. What's not built:
// actually carrying audio/video *to* the other participant — that's a
// WebRTC peer connection (SDP offer/answer + STUN/TURN for NAT
// traversal), the same category of gap LiveGo.jsx/LiveView.jsx flag for
// streaming, and it needs the same infra decision before it can be real
// rather than simulated.
export default function Call() {
  const { conversationId, mode } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { getUser } = useApp()
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(mode !== 'video')
  const [peerCount, setPeerCount] = useState(0)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const callRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: mode === 'video', audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => {})

    callRef.current = joinCall(conversationId, {
      onPeerCountChange: setPeerCount,
      onSignal: (signal) => {
        if (signal.type === 'hangup') navigate(-1)
      },
    })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      callRef.current?.leave()
    }
  }, [conversationId, mode, navigate])

  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = muted))
    setMuted((m) => !m)
  }

  const toggleCamera = () => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = cameraOff))
    setCameraOff((c) => !c)
  }

  const handleHangup = () => {
    callRef.current?.sendSignal({ type: 'hangup' })
    navigate(-1)
  }

  const otherUser = getUser(searchParams.get('peer'))

  return (
    <div className="flex h-full flex-col items-center justify-between bg-navy-950 py-10 text-white">
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-white/60">{mode === 'video' ? 'Video call' : 'Audio call'}</p>
        <p className="flex items-center gap-1.5 text-sm text-white/60">
          <Users className="h-3.5 w-3.5" />
          {peerCount > 1 ? 'Connected' : `Waiting for ${otherUser?.name || 'the other person'} to join…`}
        </p>
      </div>

      {mode === 'video' && !cameraOff ? (
        <div className="relative aspect-[3/4] w-56 overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          <p className="absolute bottom-1 left-1 right-1 text-center text-[9px] text-white/60">Your preview only</p>
        </div>
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-3xl font-bold">
          {otherUser?.name?.[0] || '?'}
        </div>
      )}

      <p className="max-w-[240px] text-center text-[11px] text-white/40">
        Audio/video isn't carried to the other person yet — that needs a media-server piece that isn't connected. This
        screen's controls and connection status are live.
      </p>

      <div className="flex items-center gap-5">
        <button onClick={toggleMic} className="rounded-full bg-white/10 p-4">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        {mode === 'video' && (
          <button onClick={toggleCamera} className="rounded-full bg-white/10 p-4">
            {cameraOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
          </button>
        )}
        <button onClick={handleHangup} className="rounded-full bg-bharat-red p-4">
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
