import React from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'

// The only account type that actually exists in the schema today is
// Personal (see docs/bharatspace_level1_schema.sql — there is no
// account_type column at all yet) — switching *to* it is therefore a
// no-op, and Creator/Brand are honestly represented as ComingSoon
// destinations rather than silently marked "built" just for having a
// settings row now. This used to be a quick-picker in Profile.jsx's •••
// menu; it moved here so that menu could be reduced to a single
// shortcut into Settings instead of duplicating rows Settings already
// has (Profile & identity for editing, Sign out at the bottom, and this).
const ACCOUNT_TYPES = [
  { id: 'personal', label: 'Personal', description: 'The standard account everyone starts with.' },
  {
    id: 'creator',
    label: 'Creator',
    description: 'A dashboard for your content, audience insights and brand collaborations.',
    comingSoon: {
      title: 'Creator Studio',
      description: 'A dashboard for your content, audience insights and brand collaborations.',
      bullets: ['Portfolio and media kit', 'Audience and growth insights', 'Brand collaboration requests', 'Rate card and availability'],
    },
  },
  {
    id: 'brand',
    label: 'Brand',
    description: 'Run campaigns and find creators to partner with.',
    comingSoon: {
      title: 'Brand Studio',
      description: 'Run campaigns and find creators to partner with, right from your account.',
      bullets: ['Company profile and products', 'Create and manage campaigns', 'Find and filter creators', 'Track collaborations'],
    },
  },
]

export default function AccountType() {
  const navigate = useNavigate()

  const handlePick = (type) => {
    if (type.id !== 'personal') {
      navigate('/coming-soon', { state: type.comingSoon })
    }
    // Personal is already the only account type that exists — nothing to persist.
  }

  return (
    <div>
      <PageHeader title="Account type" showBack />
      <div className="p-4">
        <p className="mb-4 text-sm text-ink-500">Choose how your account works. You can switch back at any time.</p>
        <div className="flex flex-col gap-2.5">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => handlePick(t)}
              className={`flex items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                t.id === 'personal' ? 'border-saffron-500 bg-saffron-50' : 'border-ink-200'
              }`}
            >
              <div>
                <p className={`text-sm font-bold ${t.id === 'personal' ? 'text-saffron-700' : 'text-ink-900'}`}>{t.label}</p>
                <p className="mt-0.5 text-xs text-ink-500">{t.description}</p>
              </div>
              {t.id === 'personal' && <span className="shrink-0 text-[11px] font-semibold text-saffron-600">Current</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
