import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Toggle from '../components/Toggle.jsx'
import { useApp } from '../context/AppContext.jsx'

const CATEGORIES = [
  { key: 'likes', label: 'Likes', sub: 'When someone likes your posts or comments' },
  { key: 'comments', label: 'Comments', sub: 'When someone comments on your posts' },
  { key: 'follows', label: 'New followers', sub: 'When someone follows you' },
  { key: 'mentions', label: 'Mentions & tags', sub: "When you're mentioned or tagged" },
  { key: 'messages', label: 'Messages', sub: 'When you get a new message' },
]

const CHANNELS = [
  { key: 'push', label: 'Push' },
  { key: 'email', label: 'Email' },
  { key: 'inApp', label: 'In-app' },
]

export default function NotificationSettings() {
  const { userSettings, updateUserSettings } = useApp()
  const { notifications } = userSettings

  const setChannel = (category, channel, value) => {
    updateUserSettings({ notifications: { [category]: { ...notifications[category], [channel]: value } } })
  }

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Notifications" showBack />
      <div className="px-4 pt-3">
        {CATEGORIES.map(({ key, label, sub }) => (
          <div key={key} className="mb-3 rounded-2xl border border-ink-100 bg-white p-4">
            <p className="text-sm font-bold text-navy-900">{label}</p>
            <p className="mt-0.5 text-xs text-ink-500">{sub}</p>
            <div className="mt-3 flex flex-col gap-2.5">
              {CHANNELS.map(({ key: channelKey, label: channelLabel }) => (
                <div key={channelKey} className="flex items-center justify-between">
                  <span className="text-sm text-ink-700">{channelLabel}</span>
                  <Toggle
                    checked={!!notifications[key]?.[channelKey]}
                    onChange={(v) => setChannel(key, channelKey, v)}
                    label={`${channelLabel} notifications for ${label}`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="mt-1 px-1 text-xs text-ink-400">
          Changes save automatically and sync across your devices.
        </p>
      </div>
    </div>
  )
}
