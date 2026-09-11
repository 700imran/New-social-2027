import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'
import { useScreenTime } from '../utils/useScreenTime.js'

// Backs both Settings -> Your Time -> Time management and -> Your
// activity insights (same substance — see Settings.jsx). minutesToday is
// device-local (useScreenTime.js); the reminder fires from
// AppLayout.jsx so it works no matter what screen someone's on, not just
// this one.
const REMINDER_OPTIONS = [null, 30, 60, 120]

export default function TimeManagement() {
  const navigate = useNavigate()
  const { userSettings, updateUserSettings } = useApp()
  const { minutesToday } = useScreenTime()
  const { dailyReminderMinutes } = userSettings.focus

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Time management" showBack />
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 text-center">
          <p className="font-display text-3xl font-bold text-navy-900">{minutesToday}m</p>
          <p className="mt-1 text-xs text-ink-500">on BharatSpace today, this device</p>
        </div>

        <p className="mb-2 mt-5 px-1 text-xs font-semibold text-ink-500">Remind me after</p>
        <div className="flex gap-2">
          {REMINDER_OPTIONS.map((mins) => (
            <button
              key={mins ?? 'off'}
              onClick={() => updateUserSettings({ focus: { dailyReminderMinutes: mins } })}
              className={`flex-1 rounded-full border px-2 py-2 text-xs font-semibold transition-colors ${
                dailyReminderMinutes === mins ? 'border-saffron-500 bg-saffron-50 text-saffron-700' : 'border-ink-200 text-ink-700'
              }`}
            >
              {mins === null ? 'Off' : `${mins}m`}
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/settings/focus')}
          className="mt-5 flex w-full items-center justify-between rounded-2xl border border-ink-100 bg-white p-4"
        >
          <div className="text-left">
            <p className="text-sm font-bold text-navy-900">Quiet hours</p>
            <p className="mt-0.5 text-xs text-ink-500">Mute notifications during set hours</p>
          </div>
          <ChevronRight className="h-4 w-4 text-ink-400" />
        </button>

        <p className="mt-4 px-1 text-xs text-ink-400">
          Today's count is local to this device and resets at midnight — it doesn't sync across devices. The
          reminder threshold does sync, like every other setting here.
        </p>
      </div>
    </div>
  )
}
