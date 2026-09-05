import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, User, Lock, Bell, ShieldOff, VolumeX, KeyRound, FileText, LogOut } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'

// A real "control center" per the product direction doc's principle:
// group everything under one roof, and be honest about what's wired up
// today vs. what's a real, named destination for later — never a toggle
// that looks like it does something but doesn't (see the Privacy section
// below: those rows are deliberately plain nav rows, not switches, since
// a switch that doesn't actually restrict anything would be worse than
// no control at all).

function Row({ icon: Icon, label, sub, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink-50"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          danger ? 'bg-bharat-red/10 text-bharat-red' : 'bg-ink-100 text-ink-700'
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${danger ? 'text-bharat-red' : 'text-ink-900'}`}>{label}</span>
        {sub && <span className="block text-xs text-ink-500">{sub}</span>}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div className="mt-5">
      <p className="px-4 pb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">{title}</p>
      <div className="divide-y divide-ink-100 bg-white">{children}</div>
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { signOut, blockedUserIds, mutedUserIds } = useApp()

  const comingSoon = (title, description, bullets) => navigate('/coming-soon', { state: { title, description, bullets } })

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  return (
    <div className="pb-8">
      <PageHeader title="Settings" showBack />

      <Section title="Account">
        <Row icon={User} label="Edit profile" onClick={() => navigate('/profile/edit')} />
        <Row icon={KeyRound} label="Change password" onClick={() => navigate('/settings/password')} />
        <Row
          icon={ShieldOff}
          label="Blocked accounts"
          sub={blockedUserIds.size ? `${blockedUserIds.size} blocked` : 'None'}
          onClick={() => navigate('/settings/blocked')}
        />
        <Row
          icon={VolumeX}
          label="Muted accounts"
          sub={mutedUserIds.size ? `${mutedUserIds.size} muted` : 'None'}
          onClick={() => navigate('/settings/muted')}
        />
      </Section>

      <Section title="Privacy">
        <Row
          icon={Lock}
          label="Who can message you"
          onClick={() =>
            comingSoon('Privacy controls', 'Fine-grained control over who can message, comment on or tag you.', [
              'Everyone / Followers / No one',
              'Per-action controls (message, comment, tag)',
              'Muted words and phrases',
            ])
          }
        />
        <Row
          icon={Lock}
          label="Who can comment on your posts"
          onClick={() =>
            comingSoon(
              'Privacy controls',
              "Same system as \"Who can message you\" — built as one consistent set of controls rather than one-off toggles.",
              []
            )
          }
        />
        <Row
          icon={Lock}
          label="Muted words"
          onClick={() =>
            comingSoon('Muted words', 'Automatically hide comments containing words or phrases you choose.', [])
          }
        />
      </Section>

      <Section title="Notifications">
        <Row
          icon={Bell}
          label="Notification preferences"
          sub="Push, email and quiet hours"
          onClick={() =>
            comingSoon(
              'Notification preferences',
              'Fine-tune which activity notifies you and when — you can already filter what you see in Activity by type today.',
              ['Per-category on/off (mentions, social, etc.)', 'Push and email channels', 'Quiet hours']
            )
          }
        />
      </Section>

      <Section title="About">
        <Row icon={FileText} label="Privacy Policy" onClick={() => navigate('/privacy')} />
        <Row icon={FileText} label="Terms of Service" onClick={() => navigate('/terms')} />
      </Section>

      <div className="mt-6 px-4">
        <button
          onClick={handleSignOut}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 py-3 text-sm font-semibold text-ink-700"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  )
}
