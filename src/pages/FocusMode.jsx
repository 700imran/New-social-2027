import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Toggle from '../components/Toggle.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function FocusMode() {
  const { userSettings, updateUserSettings } = useApp()
  const { focus } = userSettings

  const setFocus = (patch) => updateUserSettings({ focus: patch })

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Focus mode" showBack />
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <p className="text-sm font-bold text-navy-900">Focus mode</p>
              <p className="mt-0.5 text-xs text-ink-500">Reduce notifications and distractions.</p>
            </div>
            <Toggle checked={!!focus.enabled} onChange={(v) => setFocus({ enabled: v })} label="Focus mode" />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-900">Quiet hours</p>
          <p className="mt-0.5 text-xs text-ink-500">Automatically enable focus mode during these hours each day.</p>
          <div className="mt-3 flex items-center gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-ink-500">From</span>
              <input
                type="time"
                value={focus.quietHoursStart || ''}
                onChange={(e) => setFocus({ quietHoursStart: e.target.value || null })}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-xs text-ink-500">To</span>
              <input
                type="time"
                value={focus.quietHoursEnd || ''}
                onChange={(e) => setFocus({ quietHoursEnd: e.target.value || null })}
                className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900"
              />
            </label>
          </div>
        </div>

        <p className="mt-3 px-1 text-xs text-ink-400">
          Saved to your account. Push notifications aren't sent by this preview build, so quiet hours won't yet
          silence a real device — the schedule itself is saved and ready for whenever that pipeline exists.
        </p>
      </div>
    </div>
  )
}
