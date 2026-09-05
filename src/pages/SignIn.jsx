import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function SignIn() {
  const navigate = useNavigate()
  const { signIn } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const canSubmit = email.trim().length > 2 && password.length > 0
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    const result = await signIn({ email: email.trim(), password })
    setSubmitting(false)
    if (!result.ok) return // AppContext already toasted the error
    navigate('/home')
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col bg-white px-6 pb-10 pt-6">
      <button onClick={() => navigate('/')} className="focus-ring w-fit rounded-full p-1.5 text-ink-700" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mt-4 flex flex-col items-center text-center">
        <Logo size={44} />
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-900">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-500">Sign in to continue to BharatSpace.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
          <div className="mb-1.5 flex items-center justify-between">
            <span className="block text-xs font-semibold text-ink-700">Password</span>
            <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs font-medium text-saffron-600">
              Forgot?
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-ink-50 px-3.5 py-3 focus-within:border-saffron-500">
            <Lock className="h-4 w-4 text-ink-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
              required
            />
            <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password visibility">
              {showPassword ? <EyeOff className="h-4 w-4 text-ink-500" /> : <Eye className="h-4 w-4 text-ink-500" />}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-saffron-gradient px-6 py-3.5 font-display text-[15px] font-bold text-navy-950 shadow-pop transition-transform enabled:active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        New to BharatSpace?{' '}
        <Link to="/signup" className="font-semibold text-saffron-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
