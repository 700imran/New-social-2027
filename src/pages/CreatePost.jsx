import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon, Video, BarChart3, Newspaper, X, Plus } from 'lucide-react'
import Avatar from '../components/Avatar.jsx'
import ArchIllustration from '../components/ArchIllustration.jsx'
import { useApp } from '../context/AppContext.jsx'
import { TOPICS } from '../data/mockData.js'

export default function CreatePost() {
  const navigate = useNavigate()
  const { currentUser, createPost, pushToast } = useApp()
  const [text, setText] = useState('')
  const [imagePreview, setImagePreview] = useState(null)
  const [tagTopics, setTagTopics] = useState(true)
  const [selectedTopics, setSelectedTopics] = useState(['India News'])
  const [pollMode, setPollMode] = useState(false)
  const [pollOptions, setPollOptions] = useState(['', ''])
  const fileInputRef = useRef(null)

  const toggleTopic = (label) => {
    setSelectedTopics((prev) => (prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]))
  }

  const handlePhotoClick = () => fileInputRef.current?.click()

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  const updatePollOption = (i, value) => {
    setPollOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)))
  }

  const addPollOption = () => {
    if (pollOptions.length >= 4) return
    setPollOptions((prev) => [...prev, ''])
  }

  const canPost = text.trim().length > 0 || imagePreview

  const handlePost = () => {
    if (!canPost) return
    let finalText = text.trim()
    if (pollMode) {
      const options = pollOptions.filter((o) => o.trim())
      if (options.length >= 2) {
        finalText += `\n\n📊 Poll\n${options.map((o) => `• ${o}`).join('\n')}`
      }
    }
    createPost(finalText, {
      hasImage: !!imagePreview,
      imagePreview,
      tags: tagTopics ? selectedTopics : [],
    })
    navigate('/home')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 bg-white/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="focus-ring rounded-full p-1.5 text-ink-700" aria-label="Cancel">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-base font-bold text-navy-900">Create Post</h1>
        <button
          onClick={handlePost}
          disabled={!canPost}
          className="rounded-full bg-saffron-gradient px-4 py-1.5 text-sm font-bold text-navy-950 shadow-pop transition-opacity disabled:opacity-40"
        >
          Post
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex gap-3">
          <Avatar user={currentUser} size="md" />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind, BharatSpace?"
            rows={4}
            className="w-full resize-none bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-400"
            autoFocus
          />
        </div>

        {imagePreview && (
          <div className="relative mt-3 overflow-hidden rounded-xl">
            <img src={imagePreview} alt="Selected upload preview" className="max-h-72 w-full object-cover" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute right-2 top-2 rounded-full bg-navy-950/70 p-1.5 text-white"
              aria-label="Remove photo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {pollMode && (
          <div className="mt-3 rounded-xl border border-ink-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-ink-700">Poll options</p>
              <button onClick={() => setPollMode(false)} className="text-xs font-medium text-ink-500">
                Remove poll
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={(e) => updatePollOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm text-ink-900 outline-none focus:border-saffron-500"
                />
              ))}
            </div>
            {pollOptions.length < 4 && (
              <button onClick={addPollOption} className="mt-2 flex items-center gap-1 text-xs font-semibold text-saffron-600">
                <Plus className="h-3.5 w-3.5" /> Add option
              </button>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 border-y border-ink-100 py-3">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          <ActionChip icon={ImageIcon} label="Photo" onClick={handlePhotoClick} />
          <ActionChip icon={Video} label="Video" onClick={() => pushToast('Video upload coming soon')} />
          <ActionChip icon={BarChart3} label="Poll" active={pollMode} onClick={() => setPollMode((p) => !p)} />
          <ActionChip icon={Newspaper} label="Article" onClick={() => pushToast('Article composer coming soon')} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-900">Post in relevant topics</p>
              <p className="text-xs text-ink-500">News · Tips · Ideas · Opportunities</p>
            </div>
            <button
              onClick={() => setTagTopics((t) => !t)}
              className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${tagTopics ? 'bg-saffron-500' : 'bg-ink-300'}`}
              aria-label="Toggle topic tagging"
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${tagTopics ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {tagTopics && (
            <div className="mt-3 flex flex-wrap gap-2">
              {TOPICS.slice(0, 5).map((t) => {
                const active = selectedTopics.includes(t.label)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.label)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      active ? 'border-saffron-500 bg-saffron-50 text-saffron-700' : 'border-ink-200 text-ink-600'
                    }`}
                  >
                    {active && '✓ '}
                    {t.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="relative mt-6 overflow-hidden rounded-2xl">
          <ArchIllustration className="h-32 w-full" showCrowd={false} />
          <div className="absolute inset-0 flex items-center bg-navy-950/30 px-5">
            <p className="font-display text-lg font-bold leading-snug text-white">
              Let's build a<br />stronger India together 🇮🇳
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionChip({ icon: Icon, label, onClick, active = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'border-saffron-500 bg-saffron-50 text-saffron-700' : 'border-ink-200 text-ink-600'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
