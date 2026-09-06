import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, FileText, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import Logo from '../components/Logo.jsx'

// Keep this in sync with package.json's "version" — there's no build step
// wiring the two together, so this is a manual, deliberate constant
// rather than a Vite env lookup that would silently go stale otherwise.
const APP_VERSION = '1.0.0'

export default function AboutApp() {
  const navigate = useNavigate()

  return (
    <div className="pb-10">
      <PageHeader title="About" showBack />

      <div className="flex flex-col items-center px-4 pb-6 pt-8 text-center">
        <Logo size={48} />
        <p className="mt-3 font-display text-lg font-bold text-navy-900">BharatSpace</p>
        <p className="mt-1 text-sm text-ink-500">Version {APP_VERSION}</p>
      </div>

      <div className="divide-y divide-ink-100 border-t border-ink-100 bg-white">
        <button
          onClick={() => navigate('/privacy')}
          className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-ink-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1 text-sm font-semibold text-ink-900">Privacy Policy</span>
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </button>
        <button
          onClick={() => navigate('/terms')}
          className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-ink-50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-700">
            <FileText className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1 text-sm font-semibold text-ink-900">Terms of Service</span>
          <ChevronRight className="h-4 w-4 text-ink-300" />
        </button>
      </div>

      <p className="mt-6 px-6 text-center text-xs text-ink-400">
        Made with pride, for a connected Bharat.
      </p>
    </div>
  )
}
