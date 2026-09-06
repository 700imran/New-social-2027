import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, TriangleAlert } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Avatar from '../components/Avatar.jsx'
import { useApp } from '../context/AppContext.jsx'

// Account type (Personal/Creator/Brand) and the duplicate Sign out button
// used to live on this screen too — both moved to Profile's ••• menu,
// which already has Settings and Sign out, so this form is just the
// fields that actually edit your profile.
//
// The Danger Zone below stays: DeleteAccountRequest.jsx (the public, no
// -login page Google Play's Data Safety form requires) sends signed-in
// visitors here for "the real delete flow" — moving it without updating
// that redirect would silently break account deletion, so it's kept in
// place rather than relocated.
export default function EditProfile() {
  const { currentUser, updateProfile, deleteAccount } = useApp()
  const navigate = useNavigate()
  const [name, setName] = useState(currentUser.name)
  const [bio, setBio] = useState(currentUser.bio ?? '')
  const [location, setLocation] = useState(currentUser.location ?? '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const avatarInputRef = useRef(null)

  const handleAvatarClick = () => avatarInputRef.current?.click()

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSave = (e) => {
    e.preventDefault()
    updateProfile({
      name: name.trim(),
      bio: bio.trim(),
      location: location.trim(),
      avatarFile: avatarFile || undefined,
      avatarPreview: avatarPreview || undefined,
    })
    navigate('/profile')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' || deleting) return
    setDeleting(true)
    const result = await deleteAccount()
    setDeleting(false)
    if (result.ok) navigate('/')
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
          <div className="relative">
            <Avatar
              user={{
                ...currentUser,
                name,
                avatarUrl: avatarPreview || currentUser.avatarUrl,
                initials: name.split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('') || currentUser.initials,
              }}
              size="xl"
            />
            <button
              type="button"
              onClick={handleAvatarClick}
              className="focus-ring absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-saffron-gradient text-navy-950 shadow-pop"
              aria-label="Change profile photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {avatarPreview ? 'New photo selected — tap Save to apply it' : 'Tap the camera to change your photo'}
          </p>
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

        <div className="mt-2 rounded-xl border border-bharat-red/30 bg-bharat-red/5 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold text-bharat-red">
            <TriangleAlert className="h-4 w-4" /> Danger zone
          </p>
          <p className="mt-1.5 text-xs text-ink-600">
            Deleting your account permanently removes your profile, posts, comments, photos, and followers — this
            can't be undone. Read more in our{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="underline">
              Privacy Policy
            </a>
            .
          </p>

          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="mt-3 rounded-full border border-bharat-red px-4 py-2 text-xs font-bold text-bharat-red"
            >
              Delete my account
            </button>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs font-semibold text-ink-700">
                Type <span className="font-mono">DELETE</span> to confirm.
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-lg border border-bharat-red/40 bg-white px-3 py-2 text-sm outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setConfirmingDelete(false); setDeleteConfirmText('') }}
                  className="flex-1 rounded-full border border-ink-200 py-2 text-xs font-semibold text-ink-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="flex-1 rounded-full bg-bharat-red py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  {deleting ? 'Deleting…' : 'Permanently delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
