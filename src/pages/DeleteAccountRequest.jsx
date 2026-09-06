import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Mail } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { useApp } from '../context/AppContext.jsx'

const SUPPORT_EMAIL = 'privacy@bharatspace.app'

// Publicly accessible (no auth required) — this is the URL Google Play's
// Data Safety form asks for under "Account and data deletion," and it
// must work for someone who has uninstalled the app or can't sign in.
// Signed-in visitors get sent straight to the real delete flow in
// EditProfile.jsx; everyone else gets a request path that doesn't
// require the app at all. See docs/PLAY_STORE_CHECKLIST.md.
export default function DeleteAccountRequest() {
  const { isAuthenticated } = useApp()
  const navigate = useNavigate()

  return (
    <div className="app-shell mx-auto min-h-dvh max-w-2xl bg-white px-5 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/" className="focus-ring rounded-full p-1.5 text-ink-700" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Logo size={24} />
      </div>

      <h1 className="font-display text-2xl font-bold text-navy-900">Delete your account</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">
        Deleting your account permanently removes your profile, posts, comments, photos and videos, likes, follows,
        and notifications. This can't be undone. See our{' '}
        <Link to="/privacy" className="underline">Privacy Policy</Link> for details on what's deleted.
      </p>

      {isAuthenticated ? (
        <button
          onClick={() => navigate('/profile/edit')}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-bharat-red px-6 py-3.5 font-display text-[15px] font-bold text-white shadow-pop"
        >
          <Trash2 className="h-4 w-4" /> Go to account settings
        </button>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/signin"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-saffron-gradient px-6 py-3.5 text-center font-display text-[15px] font-bold text-navy-950 shadow-pop"
          >
            Sign in to delete your account
          </Link>

          <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50 p-4">
            <p className="text-sm font-semibold text-ink-800">Can't sign in?</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">
              Email us from the address on your account and we'll delete your data within 30 days. Include the email
              or phone number you signed up with so we can find the right account.
            </p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Account%20deletion%20request`}
              className="mt-3 flex w-fit items-center gap-1.5 text-sm font-semibold text-saffron-600"
            >
              <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      )}

      <p className="mt-8 text-[11px] text-ink-400">
        Some information may be retained where required by law (e.g. records needed for fraud prevention or legal
        compliance) even after account deletion — see our Privacy Policy for specifics.
      </p>
    </div>
  )
}
