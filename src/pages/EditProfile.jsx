import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function EditProfile() {
  const { currentUser, updateProfile } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState(currentUser.name)
  const [bio, setBio] = useState(currentUser.bio ?? '')
  const [location, setLocation] = useState(currentUser.location ?? '')

  const handleSave = (e) => {
    e.preventDefault()
    updateProfile({ name: name.trim(), bio: bio.trim(), location: location.trim() })
    navigate('/profile')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader
        title="Edit Profile"
        showBack
        right={
          <button
            onClick={handleSave}
            className="rounded-full bg-saffron-gradient px-4 py-1.5 text-sm font-bold text-navy-950 shadow-pop"
          >
            Save
          </button>
        }
      />

      <form onSubmit={handleSave} className="flex flex-col gap-5 px-4 py-5">
        <div className="flex flex-col items-center">
          <Avatar user={{ ...currentUser, name, initials: name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('') || currentUser.initials }} size="xl" />
          <p className="mt-2 text-xs text-ink-500">Your initials update automatically from your name</p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-700">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-saffron-500"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-700">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={200}
            className="w-full resize-none rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-saffron-500"
          />
          <span className="mt-1 block text-right text-[11px] text-ink-400">{bio.length}/200</span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-700">Location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-saffron-500"
          />
        </label>
      </form>
    </div>
  )
}
