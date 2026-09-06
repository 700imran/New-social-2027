import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'
import { isLive, updatePassword } from '../api/client.js'

// Genuinely real, not a stub: backend/src/routes/auth.js's
// PATCH /v1/auth/password already existed (used today by the
// reset-password-from-email flow) and works exactly the same way for a
// signed-in user changing their password voluntarily — this screen was
// simply the missing front door to it.
export default function ChangePassword() {
  const navigate = useNavigate()
  const { pushToast } = useApp()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters and include a letter and a number')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (!isLive) {
      pushToast('Mock mode has no real account to update — this is a no-op here.')
      navigate('/settings')
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      pushToast('Password updated')
      navigate('/settings')
    } catch (err) {
      setError(err.message || 'Could not update your password — try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="Change password" showBack />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-700">New password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-saffron-500"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-700">Confirm new password</span>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 text-sm text-ink-900 outline-none focus:border-saffron-500"
          />
        </label>
        {error && <p className="text-xs font-semibold text-bharat-red">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-full bg-saffron-gradient py-3 text-sm font-bold text-navy-950 shadow-pop transition-transform enabled:active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
