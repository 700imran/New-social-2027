import React from 'react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

const TEXT_SIZES = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

// Matches the language codes backend/src/routes/translate.js already
// accepts for comment translation — one shared list rather than two
// slightly-different ones.
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'mr', label: 'Marathi' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ur', label: 'Urdu' },
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

export default function AppearanceSettings() {
  const { userSettings, updateUserSettings } = useApp()
  const { appearance } = userSettings

  const setAppearance = (patch) => updateUserSettings({ appearance: patch })

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Language & appearance" showBack />
      <div className="px-4 pt-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-900">Theme</p>
          <div className="mt-3">
            <SegmentedControl options={THEMES} value={appearance.theme} onChange={(v) => setAppearance({ theme: v })} />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-900">Text size</p>
          <div className="mt-3">
            <SegmentedControl
              options={TEXT_SIZES}
              value={appearance.textSize}
              onChange={(v) => setAppearance({ textSize: v })}
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4">
          <p className="text-sm font-bold text-navy-900">App language</p>
          <select
            value={appearance.language}
            onChange={(e) => setAppearance({ language: e.target.value })}
            className="mt-3 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-3 px-1 text-xs text-ink-400">
          Saved to your account and synced across devices. Comment translation (each comment's ••• menu) already
          uses your language choice as its default target.
        </p>
      </div>
    </div>
  )
}
