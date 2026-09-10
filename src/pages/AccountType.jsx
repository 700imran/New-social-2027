import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'

// Switches which role in the existing roles/user_roles table (see
// docs/bharatspace_level1_schema.sql, docs/migrations/014_community_role.sql)
// is this account's active type. This used to be a permanent ComingSoon
// screen because that table only had a seat for Personal — 014 added
// Community, closing the last gap, so all four now actually persist via
// PATCH /v1/account/type (backend/src/routes/account.js).
//
// What switching does today: changes the badge/label on your profile
// and which Settings sections show (Money & Business and Your Insights
// read this to decide what to display). It does not yet build you a
// separate "Creator Studio" dashboard or a campaign-management surface
// for Brand — those are real, larger features, described honestly where
// they still don't exist rather than implied here.
const ACCOUNT_TYPES = [
  { id: 'user', label: 'Personal', description: 'The standard account. No business or creator tools shown in Settings.' },
  { id: 'creator', label: 'Creator', description: 'Adds monetization eligibility and content-performance insights to Settings.' },
  { id: 'brand', label: 'Brand', description: 'Adds business tools and audience insights to Settings.' },
  { id: 'community', label: 'Community', description: 'For an account run on behalf of a group — insights are framed around members rather than followers.' },
]

export default function AccountType() {
  const { currentUser, updateAccountType } = useApp()

  return (
    <div>
      <PageHeader title="Account type" showBack />
      <div className="p-4">
        <p className="mb-4 text-sm text-ink-500">Choose how your account works. You can switch back at any time.</p>
        <div className="flex flex-col gap-2.5">
          {ACCOUNT_TYPES.map((t) => {
            const isCurrent = currentUser.accountType === t.id
            return (
              <button
                key={t.id}
                onClick={() => updateAccountType(t.id)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                  isCurrent ? 'border-saffron-500 bg-saffron-50' : 'border-ink-200'
                }`}
              >
                <div>
                  <p className={`text-sm font-bold ${isCurrent ? 'text-saffron-700' : 'text-ink-900'}`}>{t.label}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{t.description}</p>
                </div>
                {isCurrent && <span className="shrink-0 text-[11px] font-semibold text-saffron-600">Current</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
