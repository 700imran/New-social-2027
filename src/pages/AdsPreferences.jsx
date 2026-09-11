import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Toggle from '../components/Toggle.jsx'
import { TOPICS } from '../data/mockData.js'
import { useApp } from '../context/AppContext.jsx'

export default function AdsPreferences() {
  const { userSettings, updateUserSettings } = useApp()
  const { ads_preferences: ads } = userSettings

  const setAds = (patch) => updateUserSettings({ ads_preferences: patch })
  const toggleTopic = (id) => {
    const next = ads.topics.includes(id) ? ads.topics.filter((t) => t !== id) : [...ads.topics, id]
    setAds({ topics: next })
  }

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Ads & preferences" showBack />
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <p className="text-sm font-bold text-navy-900">Personalized ads</p>
              <p className="mt-0.5 text-xs text-ink-500">Use your activity and interests to choose ads for you.</p>
            </div>
            <Toggle checked={!!ads.personalizedAds} onChange={(v) => setAds({ personalizedAds: v })} label="Personalized ads" />
          </div>
        </div>

        <p className="mb-2 mt-4 px-1 text-xs font-semibold text-ink-500">Topics you'd rather not see ads about</p>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => {
            const excluded = ads.topics.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTopic(t.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  excluded ? 'border-bharat-red bg-bharat-red/10 text-bharat-red' : 'border-ink-200 text-ink-700'
                }`}
              >
                {t.emoji} {t.label}
              </button>
            )
          })}
        </div>

        <p className="mt-4 px-1 text-xs text-ink-400">
          Saved to your account. This app doesn't serve ads yet — these preferences are ready for whenever it does,
          same as picking a payout method before Money & Business has a payment processor connected.
        </p>
      </div>
    </div>
  )
}
