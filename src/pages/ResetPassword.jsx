import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import * as api from '../api/client.js'
import { useApp } from '../context/AppContext.jsx'

// Supabase's password-reset email links back to
// `${FRONTEND_URL}/reset-password#access_token=...&type=recovery` (see
// backend/src/routes/auth.js's /forgot-password, and wrangler.toml's
// FRONTEND_URL). The token lives in the URL *fragment*, not a query
// string or route param, because Supabase's own email template puts it
// there — it never touches this app's server, only the browser.
function useRecoveryToken() {
  const [token, setToken] = useState(undefined) // undefined = still checking, null = absent/invalid
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = params.get('access_token')
    const type = params.get('type')
    setToken(accessToken && type === 'recovery' ? accessToken : null)
    // Clear the token out of the visible URL once read — it's sensitive
    // and otherwise sits in browser history / could be re-shared.
    if (accessToken) window.history.replaceState(null, '', window.location.pathname)
  }, [])
  return token
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const { pushToast } = useApp()
  const recoveryToken = useRecoveryToken()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isStrongPassword = (pw) => pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isStrongPassword(password) || submitting || !recoveryToken) return
    setSubmitting(true)
    try {
      await api.updatePasswordWithToken(recoveryToken, password)
      pushToast('Password updated — please sign in.')
      navigate('/signin')
    } catch (err) {
      pushToast(err.message || 'Could not update your password — the link may have expired.')
    } finally {
      setSubmitting(false)
    }
  }

  if (recoveryToken === undefined) return null // brief check, avoids a flash of the error state

  if (recoveryToken === null) {
    return (
      <div className="app-shell flex min-h-dvh flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-bharat-red" />
        <h1 className="font-display text-xl font-bold text-navy-900">This link isn't valid</h1>
        <p className="max-w-xs text-sm text-ink-500">
          It may have already been used or expired. Request a new reset link and try again.
        </p>
        <button
          onClick={() => navigate('/forgot-password')}
          className="mt-2 rounded-full bg-saffron-gradient px-6 py-3 font-display text-sm font-bold text-navy-950 shadow-pop"
        >
          Request a new link
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-white px-6 pb-10 pt-6">
      <div className="mt-4 flex flex-col items-center text-center">
        <Logo size={44} />
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Set a new password</h1>
        <p className="mt-1 text-sm text-ink-500">Choose something you haven't used here before.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-700">New password</span>
          <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 focus-within:border-saffron-500">
            <Lock className="h-4 w-4 text-ink-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters, with a letter and a number"
              className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
              required
              autoFocus
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
              {showPassword ? <EyeOff className="h-4 w-4 text-ink-500" /> : <Eye className="h-4 w-4 text-ink-500" />}
            </button>
          </div>
          {password.length > 0 && !isStrongPassword(password) && (
            <p className="mt-1 text-[11px] text-ink-500">At least 8 characters, including a letter and a number.</p>
          )}
        </label>

        <button
          type="submit"
          disabled={!isStrongPassword(password) || submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-saffron-gradient px-6 py-3.5 font-display text-[15px] font-bold text-navy-950 shadow-pop transition-transform enabled:active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
