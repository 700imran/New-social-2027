import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, User as UserIcon, Eye, EyeOff } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import TurnstileWidget from '../components/TurnstileWidget.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function SignUp() {
  const navigate = useNavigate()
  const { signUp } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(true)

  const isStrongPassword = (pw) => pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw)
  const canSubmit = name.trim().length > 1 && email.trim().length > 3 && isStrongPassword(password) && agreed
  const [submitting, setSubmitting] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState(null)
  // Honeypot: a field real users never see or fill (hidden off-screen,
  // never focusable). Bots that blindly fill every input on a form will
  // fill this one too — if it's non-empty, silently drop the request
  // rather than telling the bot anything useful. See handleSubmit below
  // and backend/src/routes/auth.js's matching check.
  const [website, setWebsite] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    if (website.trim()) {
      // Honeypot tripped — almost certainly a bot. Don't reveal that
      // anything was detected; just act like it worked and move on.
      navigate('/onboarding')
      return
    }
    setSubmitting(true)
    const result = await signUp({ name: name.trim(), email: email.trim(), password, turnstileToken, website })
    setSubmitting(false)
    if (!result.ok) return // AppContext already toasted the error
    if (result.needsConfirmation) {
      navigate('/signin')
      return
    }
    navigate('/onboarding')
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-white px-6 pb-10 pt-6">
      <button onClick={() => navigate('/')} className="focus-ring w-fit rounded-full p-1.5 text-ink-700" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mt-4 flex flex-col items-center text-center">
        <Logo size={44} />
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Create your account</h1>
        <p className="mt-1 text-sm text-ink-500">Join millions of voices building a stronger India.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        {/* Honeypot — real users never see this (off-screen, unfocusable,
            hidden from screen readers). See handleSubmit above. */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-700">Full name</span>
          <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 focus-within:border-saffron-500">
            <UserIcon className="h-4 w-4 text-ink-500" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pooja Sharma"
              className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-700">Email or phone</span>
          <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 focus-within:border-saffron-500">
            <Mail className="h-4 w-4 text-ink-500" />
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-700">Password</span>
          <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 focus-within:border-saffron-500">
            <Lock className="h-4 w-4 text-ink-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters, with a letter and a number"
              className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
              required
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
              {showPassword ? <EyeOff className="h-4 w-4 text-ink-500" /> : <Eye className="h-4 w-4 text-ink-500" />}
            </button>
          </div>
          {password.length > 0 && !isStrongPassword(password) && (
            <p className="mt-1 text-[11px] text-ink-500">At least 8 characters, including a letter and a number.</p>
          )}
        </label>

        <label className="mt-1 flex items-start gap-2 text-xs text-ink-500">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-saffron-600 focus:ring-saffron-500"
          />
          I agree to the Terms of Service and Privacy Policy
        </label>

        <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-saffron-gradient px-6 py-3.5 font-display text-[15px] font-bold text-navy-950 shadow-pop transition-transform enabled:active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/signin" className="font-semibold text-saffron-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
