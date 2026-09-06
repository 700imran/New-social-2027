import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Toggle from '../components/Toggle.jsx'
import { useApp } from '../context/AppContext.jsx'

const WHO_CAN_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'followers', label: 'People you follow' },
  { value: 'nobody', label: 'No one' },
]

const FILTER_OPTIONS = [
  { value: 'less', label: 'Less' },
  { value: 'standard', label: 'Standard' },
  { value: 'more', label: 'More' },
]

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl bg-ink-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
            value === opt.value ? 'bg-white text-navy-900 shadow-sm' : 'text-ink-500'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// Covers three leaves from Settings.jsx's new architecture — Privacy,
// Content controls, and Interactions — since all three ultimately edit
// the same `privacy` object in user_settings (see
// docs/migrations/011_user_settings.sql); splitting them into three
// screens that each save a slice of one record would just mean more taps
// to change related things at the same time.
export default function PrivacySettings() {
  const { userSettings, updateUserSettings } = useApp()
  const { privacy } = userSettings

  const setPrivacy = (patch) => updateUserSettings({ privacy: patch })

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Privacy" showBack />
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <p className="text-sm font-bold text-navy-900">Private account</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Only approved followers can see your posts and reels.
              </p>
            </div>
            <Toggle
              checked={!!privacy.isPrivate}
              onChange={(v) => setPrivacy({ isPrivate: v })}
              label="Private account"
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-900">Who can message you</p>
          <p className="mt-0.5 text-xs text-ink-500">Controls who can start a new conversation with you.</p>
          <div className="mt-3">
            <SegmentedControl
              options={WHO_CAN_OPTIONS}
              value={privacy.whoCanMessage}
              onChange={(v) => setPrivacy({ whoCanMessage: v })}
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-900">Who can comment on your posts</p>
          <p className="mt-0.5 text-xs text-ink-500">Also covers mentions and tags from people outside this group.</p>
          <div className="mt-3">
            <SegmentedControl
              options={WHO_CAN_OPTIONS}
              value={privacy.whoCanComment}
              onChange={(v) => setPrivacy({ whoCanComment: v })}
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-900">Sensitive content filter</p>
          <p className="mt-0.5 text-xs text-ink-500">How much sensitive content to filter from your feed and search.</p>
          <div className="mt-3">
            <SegmentedControl
              options={FILTER_OPTIONS}
              value={privacy.sensitiveContentFilter}
              onChange={(v) => setPrivacy({ sensitiveContentFilter: v })}
            />
          </div>
        </div>

        <p className="mt-3 px-1 text-xs text-ink-400">
          Changes save automatically. Sharing permissions for individual posts are still set from that post's own
          Share menu.
        </p>
      </div>
    </div>
  )
}
