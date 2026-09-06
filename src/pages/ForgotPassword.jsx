import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import TurnstileWidget from '../components/TurnstileWidget.jsx'
import * as api from '../api/client.js'
import { useApp } from '../context/AppContext.jsx'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { pushToast } = useApp()
  const [email, setEmail] = useState('')
  const [turnstileToken, setTurnstileToken] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || submitting) return
    setSubmitting(true)
    try {
      await api.forgotPassword(email.trim(), turnstileToken)
      // Always show success — the backend intentionally returns the same
      // response whether or not the email is registered, so the UI must
      // match that (a different UI state for "not found" would defeat
      // the point). See backend/src/routes/auth.js's /forgot-password.
      setSent(true)
    } catch {
      // Network/validation failure only — account-existence is never the
      // reason this branch runs.
      pushToast('Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-white px-6 pb-10 pt-6">
      <button onClick={() => navigate('/signin')} className="focus-ring w-fit rounded-full p-1.5 text-ink-700" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mt-4 flex flex-col items-center text-center">
        <Logo size={44} />
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Reset your password</h1>
        <p className="mt-1 max-w-xs text-sm text-ink-500">
          Enter the email on your account and we'll send a link to reset your password.
        </p>
      </div>

      {sent ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-ink-100 bg-ink-50 p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-bharat-green" />
          <p className="text-sm text-ink-700">
            If an account exists for <span className="font-semibold">{email.trim()}</span>, a reset link is on its
            way. Check your inbox (and spam folder).
          </p>
          <button onClick={() => navigate('/signin')} className="mt-1 text-sm font-semibold text-saffron-600">
            Back to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-700">Email</span>
            <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 focus-within:border-saffron-500">
              <Mail className="h-4 w-4 text-ink-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                required
              />
            </div>
          </label>

          <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />

          <button
            type="submit"
            disabled={!email.trim() || submitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-saffron-gradient px-6 py-3.5 font-display text-[15px] font-bold text-navy-950 shadow-pop transition-transform enabled:active:scale-[0.98] disabled:opacity-40"
          >
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </div>
  )
}
