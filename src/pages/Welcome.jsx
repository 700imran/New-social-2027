import React from 'react'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import GlobeIllustration from '../components/GlobeIllustration.jsx'

// Shown every time an unauthenticated visitor lands on "/", right after
// LaunchSplash (see App.jsx) — a regular screen now, not a one-time
// first-run flag. Both Skip and Get Started move forward into sign-up;
// Get Started is just the more committed framing of the same next step.
// This screen replaces Landing as the default "/" experience, so the
// "already have an account" path is repeated here rather than only
// living on Landing.
export default function Welcome({ onDone }) {
  const navigate = useNavigate()
  return (
    <div className="app-shell relative flex min-h-dvh flex-col overflow-hidden bg-white px-6 pb-8 pt-5">
      <div className="flex justify-end">
        <button onClick={onDone} className="focus-ring rounded-full px-2 py-1 text-sm font-medium text-ink-500">
          Skip
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center text-center">
        <Logo size={52} variant="brand" />
        <h1 className="mt-5 font-display text-[26px] font-extrabold leading-tight text-navy-900">
          Welcome to
          <br /> BharatSpace
        </h1>
        <p className="mt-3 max-w-[280px] text-sm leading-snug text-ink-500">
          Real People. Real Ideas.
          <br /> A Bigger India. A Connected World.
        </p>
      </div>

      <div className="relative mt-6 flex-1">
        <GlobeIllustration className="absolute inset-x-0 bottom-0 h-full w-full" />
      </div>

      <button
        onClick={onDone}
        className="relative flex w-full items-center justify-center gap-2 rounded-full bg-welcome-gradient px-6 py-3.5 font-display text-[15px] font-bold text-white shadow-pop transition-transform active:scale-[0.98]"
      >
        Get Started
        <ArrowRight className="h-4 w-4" />
      </button>
      <button
        onClick={() => navigate('/signin')}
        className="focus-ring mt-4 text-sm font-medium text-ink-500"
      >
        Already have an account? <span className="font-semibold text-navy-900">Sign in</span>
      </button>
    </div>
  )
}
