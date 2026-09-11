import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Toggle from '../components/Toggle.jsx'
import { useApp } from '../context/AppContext.jsx'

const AUTOPLAY_OPTIONS = [
  { id: 'always', label: 'Always' },
  { id: 'wifi', label: 'Wi-Fi only' },
  { id: 'never', label: 'Never' },
]

export default function DataUsage() {
  const { userSettings, updateUserSettings } = useApp()
  const { data_usage: data } = userSettings
  const setData = (patch) => updateUserSettings({ data_usage: patch })

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Data usage" showBack />
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <p className="text-sm font-bold text-navy-900">Data saver</p>
              <p className="mt-0.5 text-xs text-ink-500">Load lower-quality images and video to use less data.</p>
            </div>
            <Toggle checked={!!data.dataSaver} onChange={(v) => setData({ dataSaver: v })} label="Data saver" />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-900">Autoplay videos</p>
          <p className="mt-0.5 text-xs text-ink-500">Choose when videos play automatically as you scroll.</p>
          <div className="mt-3 flex gap-2">
            {AUTOPLAY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setData({ autoPlayVideos: opt.id })}
                className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                  data.autoPlayVideos === opt.id ? 'border-saffron-500 bg-saffron-50 text-saffron-700' : 'border-ink-200 text-ink-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 px-1 text-xs text-ink-400">Saved to your account and synced across devices.</p>
      </div>
    </div>
  )
}
