import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronDown,
  User,
  Activity,
  Bookmark,
  Archive,
  Layers,
  Bell,
  Sparkles,
  Star,
  Tag,
  VolumeX,
  Globe,
  Clock,
  Moon,
  BarChart2,
  UserCheck,
  Users,
  HeartHandshake,
  ShieldOff,
  MessageSquare,
  Lock,
  KeyRound,
  ShieldAlert,
  SlidersHorizontal,
  Ban,
  CreditCard,
  Megaphone,
  Wand2,
  LayoutDashboard,
  Briefcase,
  PieChart,
  TrendingUp,
  Eye,
  Database,
  Smartphone,
  HelpCircle,
  Info,
  LogOut,
  Trash2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useApp } from '../context/AppContext.jsx'

// Settings — New Navigation Architecture.
//
// Organized around what the user wants to DO (Your Space, Your
// Experience, Your Connections, ...) rather than internal platform
// terminology, per the product direction doc. Each group is a
// collapsible card — 8 groups × 4-5 destinations each is too much to
// show flat on one screen without it reading exactly like the
// "technical settings dump" this is meant to avoid.
//
// Every leaf below is one of two honest things, same principle
// ComingSoon.jsx itself documents: a REAL row that navigates to a
// screen that actually does something today, or a named ComingSoon
// destination with a real description of what's planned — never a row
// that looks wired up but silently does nothing.

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

function Group({ emoji, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex w-full items-center justify-between px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <span aria-hidden="true" className="text-base leading-none">{emoji}</span>
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="divide-y divide-ink-100 border-t border-ink-100">{children}</div>}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { signOut, blockedUserIds, mutedUserIds, userSettings } = useApp()

  const comingSoon = (title, description, bullets) => navigate('/coming-soon', { state: { title, description, bullets } })

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  return (
    <div className="bg-ink-50 pb-10">
      <PageHeader title="Settings" showBack />

      <div className="px-4">
        <Group emoji="🧭" title="Your Space" defaultOpen>
          <Row icon={User} label="Profile & identity" sub="Name, username, photo, bio, links" onClick={() => navigate('/profile/edit')} />
          <Row icon={Activity} label="Your activity" sub="Posts, comments, likes and history" onClick={() => navigate('/activity')} />
          <Row icon={Bookmark} label="Saved" sub="Saved posts, videos and collections" onClick={() => navigate('/profile', { state: { tab: 'saved' } })} />
          <Row
            icon={Archive}
            label="Archive"
            onClick={() =>
              comingSoon('Archive', 'Archived posts, stories and reels — hidden from your profile without being deleted.', [
                'Archive a post or reel from its ••• menu',
                'Restore anything you archive, any time',
                'Archived content stays private to you',
              ])
            }
          />
          <Row
            icon={Layers}
            label="Your content"
            onClick={() =>
              comingSoon('Your content', 'One place to manage every post, story, reel, photo and video you\u2019ve shared.', [
                'Bulk manage or delete older posts',
                'Download a copy of your media',
                'See what\u2019s public vs. archived at a glance',
              ])
            }
          />
        </Group>

        <Group emoji="🔔" title="Your Experience">
          <Row
            icon={Bell}
            label="Notifications"
            sub="Push, email and in-app alerts"
            onClick={() => navigate('/settings/notifications')}
          />
          <Row
            icon={Sparkles}
            label="Feed & recommendations"
            onClick={() =>
              comingSoon('Feed & recommendations', 'Control what shows up in your feed and why.', [
                'See fewer posts like this',
                'Prioritize people you interact with most',
                'Reset your recommendations',
              ])
            }
          />
          <Row icon={Star} label="Following & favorites" sub="Manage who you follow" onClick={() => navigate('/profile/following')} />
          <Row
            icon={Tag}
            label="Topics & interests"
            sub="Fine-tune your feed"
            onClick={() => navigate('/settings/topics')}
          />
          <Row
            icon={VolumeX}
            label="Muted & hidden"
            sub={mutedUserIds.size ? `${mutedUserIds.size} muted` : 'None muted'}
            onClick={() => navigate('/settings/muted')}
          />
          <Row icon={Globe} label="Language & appearance" onClick={() => navigate('/settings/appearance')} />
        </Group>

        <Group emoji="⏱️" title="Your Time">
          <Row
            icon={Clock}
            label="Time management"
            onClick={() =>
              comingSoon('Time management', 'See your daily usage and set reminders or quiet hours.', [
                'Daily time-spent summary',
                'Reminders after a set amount of time',
                'Scheduled quiet hours',
              ])
            }
          />
          <Row
            icon={Moon}
            label="Focus mode"
            onClick={() => navigate('/settings/focus')}
          />
          <Row
            icon={BarChart2}
            label="Your activity insights"
            onClick={() =>
              comingSoon('Your activity insights', 'Time spent, interaction patterns and usage trends over time.', [])
            }
          />
        </Group>

        <Group emoji="👥" title="Your Connections">
          <Row icon={UserCheck} label="Following" sub="Accounts you follow" onClick={() => navigate('/profile/following')} />
          <Row icon={Users} label="Followers" sub="People who follow you" onClick={() => navigate('/profile/followers')} />
          <Row
            icon={HeartHandshake}
            label="Close friends"
            onClick={() =>
              comingSoon('Close friends', 'Choose who gets special access to your close-friends-only content.', [
                'Build your close friends list',
                'Share posts and stories to it only',
              ])
            }
          />
          <Row
            icon={ShieldOff}
            label="Blocked accounts"
            sub={blockedUserIds.size ? `${blockedUserIds.size} blocked` : 'None blocked'}
            onClick={() => navigate('/settings/blocked')}
          />
          <Row
            icon={MessageSquare}
            label="Interactions"
            sub="Comments, messages and sharing"
            onClick={() => navigate('/settings/privacy')}
          />
        </Group>

        <Group emoji="🔐" title="Privacy & Safety">
          <Row
            icon={Lock}
            label="Privacy"
            sub="Account visibility, messages, comments"
            onClick={() => navigate('/settings/privacy')}
          />
          <Row icon={KeyRound} label="Security" sub="Change your password" onClick={() => navigate('/settings/password')} />
          <Row
            icon={ShieldAlert}
            label="Account protection"
            onClick={() =>
              comingSoon('Account protection', 'Suspicious-activity alerts and account recovery options.', [
                'Login alerts for new devices',
                'Recovery email/phone',
              ])
            }
          />
          <Row
            icon={SlidersHorizontal}
            label="Content controls"
            sub="Sensitive content filter"
            onClick={() => navigate('/settings/privacy')}
          />
          <Row
            icon={Ban}
            label="Words & comments"
            sub={userSettings.muted_words.length ? `${userSettings.muted_words.length} muted words` : 'No muted words'}
            onClick={() => navigate('/settings/muted-words')}
          />
        </Group>

        <Group emoji="💰" title="Money & Business">
          <Row
            icon={CreditCard}
            label="Payments"
            onClick={() => comingSoon('Payments', 'Payment methods, purchases, subscriptions and transaction history.', [])}
          />
          <Row
            icon={Megaphone}
            label="Ads & preferences"
            onClick={() => comingSoon('Ads & preferences', 'Ad topics, personalization and advertising controls.', [])}
          />
          <Row
            icon={Wand2}
            label="Creator tools"
            onClick={() =>
              comingSoon(
                'Creator tools',
                'Monetization, subscriptions and branded-content tools — schema-ready on the backend, not yet surfaced in the app.',
                []
              )
            }
          />
          <Row
            icon={LayoutDashboard}
            label="Professional dashboard"
            onClick={() => comingSoon('Professional dashboard', 'Performance, audience and content tools for creators and businesses.', [])}
          />
          <Row
            icon={Briefcase}
            label="Account type & tools"
            onClick={() => navigate('/settings/account-type')}
          />
        </Group>

        <Group emoji="📊" title="Your Insights">
          <Row icon={PieChart} label="Overview" onClick={() => navigate('/settings/insights/overview')} />
          <Row icon={TrendingUp} label="Content insights" onClick={() => navigate('/settings/insights/content')} />
          <Row icon={Users} label="Audience" onClick={() => navigate('/settings/insights/audience')} />
          <Row icon={Sparkles} label="Recommendations insights" onClick={() => navigate('/settings/insights/discovery')} />
        </Group>

        <Group emoji="🛠️" title="Tools & Support">
          <Row
            icon={Eye}
            label="Accessibility"
            onClick={() =>
              comingSoon('Accessibility', 'Screen reader, captions, motion and contrast options.', [
                'Reduce motion',
                'Increase contrast',
                'Screen-reader friendly labels app-wide',
              ])
            }
          />
          <Row
            icon={Database}
            label="Data usage"
            onClick={() => comingSoon('Data usage', 'Media quality, downloads and data-saving controls.', [])}
          />
          <Row
            icon={Smartphone}
            label="App & device"
            onClick={() => comingSoon('App & device', 'App behavior, connected devices and device permissions.', [])}
          />
          <Row icon={HelpCircle} label="Help & support" onClick={() => navigate('/settings/help')} />
          <Row icon={Info} label="About" sub="Version, Privacy Policy, Terms" onClick={() => navigate('/settings/about')} />
        </Group>
      </div>

      <div className="mt-6 flex flex-col gap-3 px-4">
        <button
          onClick={handleSignOut}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-700"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <button
          onClick={() => navigate('/delete-account-request')}
          className="focus-ring flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-ink-400"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete account
        </button>
      </div>
    </div>
  )
}
