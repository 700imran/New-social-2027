import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import Toggle from '../components/Toggle.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function FeedPreferences() {
  const { userSettings, updateUserSettings, resetFeedRecommendations, hiddenPostIds } = useApp()
  const { feed_preferences: fp } = userSettings

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Feed & recommendations" showBack />
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <p className="text-sm font-bold text-navy-900">Prioritize people you interact with most</p>
              <p className="mt-0.5 text-xs text-ink-500">Show more from accounts you engage with often.</p>
            </div>
            <Toggle
              checked={!!fp.prioritizeFollowing}
              onChange={(v) => updateUserSettings({ feed_preferences: { prioritizeFollowing: v } })}
              label="Prioritize people you interact with most"
            />
          </div>
        </div>

        <button
          onClick={resetFeedRecommendations}
          className="mt-3 w-full rounded-2xl border border-ink-100 bg-white p-4 text-left"
        >
          <p className="text-sm font-bold text-navy-900">Reset recommendations</p>
          <p className="mt-0.5 text-xs text-ink-500">
            {hiddenPostIds.size > 0
              ? `Un-hide ${hiddenPostIds.size} post${hiddenPostIds.size === 1 ? '' : 's'} you've hidden`
              : "You haven't hidden any posts yet"}
          </p>
        </button>

        <p className="mt-4 px-1 text-xs text-ink-400">
          "See fewer posts like this" from any post's ••• menu is the other side of the same list this resets.
        </p>
      </div>
    </div>
  )
}
