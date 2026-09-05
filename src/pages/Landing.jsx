import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowRight, Users, Zap, Heart, Rocket } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import ArchIllustration from '../components/ArchIllustration.jsx'

const FEATURES = [
  { icon: Users, title: 'Real People', desc: 'Authentic voices from across India' },
  { icon: Zap, title: 'Real-Time Updates', desc: 'Be the first to know what’s happening' },
  { icon: Heart, title: 'Meaningful Engagement', desc: 'Discuss, share, contribute' },
  { icon: Rocket, title: 'A Stronger India', desc: 'Ideas and actions for a better tomorrow' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="app-shell min-h-dvh bg-navy-950">
      <div className="relative flex flex-col items-center px-6 pb-10 pt-12 text-center">
        <Logo size={56} />
        <h1 className="mt-4 font-display text-3xl font-extrabold text-white">BharatSpace</h1>
        <p className="mt-1 text-sm tracking-wide text-saffron-300">People · Ideas · India</p>

        <h2 className="mt-8 font-display text-xl font-bold leading-snug text-white">
          India's Real-Time
          <br /> Social Network
        </h2>
        <p className="mt-3 text-sm text-white/70">Local Voices &nbsp;|&nbsp; Real Stories &nbsp;|&nbsp; Stronger Together</p>

        <button
          onClick={() => navigate('/signup')}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-saffron-gradient px-6 py-3.5 font-display text-[15px] font-bold text-navy-950 shadow-pop transition-transform active:scale-[0.98]"
        >
          Join BharatSpace
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate('/signin')}
          className="focus-ring mt-4 text-sm font-medium text-white/70 underline-offset-4 hover:underline"
        >
          Already have an account? Sign in
        </button>
      </div>

      <div className="relative -mt-2 h-56 w-full overflow-hidden">
        <ArchIllustration className="h-full w-full" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-navy-950 to-transparent" />
      </div>

      <div className="bg-white px-5 pb-10 pt-8">
        <p className="mb-4 text-center font-display text-base font-bold text-navy-900">Why BharatSpace?</p>
        <div className="grid grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-ink-100 p-3.5">
              <span className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-saffron-50 text-saffron-600">
                <f.icon className="h-[18px] w-[18px]" />
              </span>
              <p className="text-[13px] font-semibold text-ink-900">{f.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 h-1 w-full rounded-full bg-tricolor-thread" />

        <button
          onClick={() => navigate('/signup')}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-saffron-gradient px-6 py-3.5 font-display text-[15px] font-bold text-navy-950 shadow-pop transition-transform active:scale-[0.98]"
        >
          Be Part of India's Digital Movement
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-5 text-center text-[11px] text-ink-400">
          <Link to="/privacy" className="underline">Privacy Policy</Link>
          {' · '}
          <Link to="/terms" className="underline">Terms of Service</Link>
        </p>
      </div>
    </div>
  )
}
