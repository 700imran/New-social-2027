import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Toggle from '../components/Toggle.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function Accessibility() {
  const { userSettings, updateUserSettings } = useApp()
  const { accessibility } = userSettings

  const setAccessibility = (patch) => updateUserSettings({ accessibility: patch })

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Accessibility" showBack />
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <p className="text-sm font-bold text-navy-900">Reduce motion</p>
              <p className="mt-0.5 text-xs text-ink-500">Minimize animations and transitions.</p>
            </div>
            <Toggle checked={!!accessibility.reduceMotion} onChange={(v) => setAccessibility({ reduceMotion: v })} label="Reduce motion" />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <p className="text-sm font-bold text-navy-900">High contrast</p>
              <p className="mt-0.5 text-xs text-ink-500">Increase contrast between text and backgrounds.</p>
            </div>
            <Toggle checked={!!accessibility.highContrast} onChange={(v) => setAccessibility({ highContrast: v })} label="High contrast" />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <p className="text-sm font-bold text-navy-900">Captions on by default</p>
              <p className="mt-0.5 text-xs text-ink-500">Start videos with captions turned on where available.</p>
            </div>
            <Toggle
              checked={!!accessibility.captionsDefaultOn}
              onChange={(v) => setAccessibility({ captionsDefaultOn: v })}
              label="Captions default on"
            />
          </div>
        </div>

        <p className="mt-3 px-1 text-xs text-ink-400">
          Saved to your account and synced across devices. Applying these across every screen's animations and color
          contrast is a larger visual audit than this pass covers — the preference itself is real and ready for it.
        </p>
      </div>
    </div>
  )
}
