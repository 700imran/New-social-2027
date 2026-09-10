import React, { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import LaunchSplash from './components/LaunchSplash.jsx'
import { useApp } from './context/AppContext.jsx'
import { prefetchOnIdle } from './utils/prefetchRoutes.js'

// Route-level code splitting. Every one of these ~30 screens used to be
// imported eagerly right here, which meant a first-time visit downloaded
// and parsed the entire app — every Settings sub-page, every onboarding
// step, Reels, Communities, all of it — before the very first screen
// could render. React.lazy() below means the initial bundle only ships
// the router shell plus whichever screen actually shows first; every
// other screen loads on the route that needs it. The <Suspense> boundary
// and prefetchOnIdle() calls further down exist so that split doesn't
// show up as a visible loading flash during normal, everyday navigation.
const Landing = lazy(() => import('./pages/Landing.jsx'))
const Welcome = lazy(() => import('./pages/Welcome.jsx'))
const SignUp = lazy(() => import('./pages/SignUp.jsx'))
const SignIn = lazy(() => import('./pages/SignIn.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'))
const InterestSelection = lazy(() => import('./pages/InterestSelection.jsx'))
const Home = lazy(() => import('./pages/Home.jsx'))
const Discover = lazy(() => import('./pages/Discover.jsx'))
const CreatePost = lazy(() => import('./pages/CreatePost.jsx'))
const Activity = lazy(() => import('./pages/Activity.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const EditProfile = lazy(() => import('./pages/EditProfile.jsx'))
const FollowList = lazy(() => import('./pages/FollowList.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const ChangePassword = lazy(() => import('./pages/ChangePassword.jsx'))
const AccountType = lazy(() => import('./pages/AccountType.jsx'))
const TopicsSettings = lazy(() => import('./pages/TopicsSettings.jsx'))
const LiveGo = lazy(() => import('./pages/LiveGo.jsx'))
const LiveView = lazy(() => import('./pages/LiveView.jsx'))
const Call = lazy(() => import('./pages/Call.jsx'))
const InsightsOverview = lazy(() => import('./pages/InsightsOverview.jsx'))
const InsightsContent = lazy(() => import('./pages/InsightsContent.jsx'))
const InsightsAudience = lazy(() => import('./pages/InsightsAudience.jsx'))
const InsightsDiscovery = lazy(() => import('./pages/InsightsDiscovery.jsx'))
const HelpSupport = lazy(() => import('./pages/HelpSupport.jsx'))
const ManagedAccounts = lazy(() => import('./pages/ManagedAccounts.jsx'))
const AboutApp = lazy(() => import('./pages/AboutApp.jsx'))
const NotificationSettings = lazy(() => import('./pages/NotificationSettings.jsx'))
const PrivacySettings = lazy(() => import('./pages/PrivacySettings.jsx'))
const AppearanceSettings = lazy(() => import('./pages/AppearanceSettings.jsx'))
const FocusMode = lazy(() => import('./pages/FocusMode.jsx'))
const MutedWords = lazy(() => import('./pages/MutedWords.jsx'))
const PostDetail = lazy(() => import('./pages/PostDetail.jsx'))
const Reels = lazy(() => import('./pages/Reels.jsx'))
const Communities = lazy(() => import('./pages/Communities.jsx'))
const Messages = lazy(() => import('./pages/Messages.jsx'))
const ChatThread = lazy(() => import('./pages/ChatThread.jsx'))
const ComingSoon = lazy(() => import('./pages/ComingSoon.jsx'))
const Privacy = lazy(() => import('./pages/Privacy.jsx'))
const Terms = lazy(() => import('./pages/Terms.jsx'))
const DeleteAccountRequest = lazy(() => import('./pages/DeleteAccountRequest.jsx'))

// Keeps a signed-in user from landing back on the marketing/auth screens —
// e.g. hitting "/" or "/signin" directly with a saved session still active.
function RedirectIfAuthed({ children }) {
  const { isAuthenticated } = useApp()
  if (isAuthenticated) return <Navigate to="/home" replace />
  return children
}

// Suspense fallback for a route chunk that hasn't finished downloading
// yet. Deliberately minimal — no logo, no copy — since prefetchOnIdle
// below means this should rarely actually be seen in practice; it exists
// so a slow connection gets a small spinner instead of a blank screen,
// not a second rebranded splash.
function RouteFallback() {
  return (
    <div className="flex min-h-[40dvh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-200 border-t-saffron-500" />
    </div>
  )
}

export default function App() {
  const { authLoading, isAuthenticated } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [introTimerDone, setIntroTimerDone] = useState(false)

  // Warms the next screen most sessions are about to open, during
  // otherwise-idle time: Welcome/SignUp while a signed-out visit is
  // sitting on the splash/auth-restore spinner, or the five bottom-nav
  // destinations once signed in — the same "zero-flicker navigation"
  // goal already written into this project's own UI performance spec,
  // now actually wired up for route code and not just data.
  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated) {
      prefetchOnIdle([
        () => import('./pages/Home.jsx'),
        () => import('./pages/Discover.jsx'),
        () => import('./pages/Reels.jsx'),
        () => import('./pages/CreatePost.jsx'),
        () => import('./pages/Profile.jsx'),
      ])
    } else {
      prefetchOnIdle([() => import('./pages/Welcome.jsx'), () => import('./pages/SignUp.jsx')])
    }
  }, [authLoading, isAuthenticated])

  // Shown while live mode restores a saved session (see AppContext.jsx's
  // bootstrap effect) — in mock mode authLoading is false immediately, so
  // this branch is skipped entirely.
  if (authLoading) return <LaunchSplash />

  // The splash-then-welcome sequence runs on every fresh, unauthenticated
  // visit to the root path — a regular part of the flow, not a one-time
  // first-run experience gated behind a "seen it once" flag. It resolves
  // itself naturally: Welcome's onDone below navigates to /signup, which
  // changes location.pathname and drops showIntro on the next render — no
  // localStorage bookkeeping needed. Gating on the path (not just auth
  // state) still matters: a password-reset link, /privacy, /terms, or
  // /delete-account-request must always open directly — Play Console and
  // reset emails link straight to them, and intercepting those with
  // onboarding would break that.
  const showIntro = location.pathname === '/' && !isAuthenticated

  if (showIntro && !introTimerDone) {
    return <LaunchSplash onDone={() => setIntroTimerDone(true)} />
  }
  if (showIntro && introTimerDone) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Welcome onDone={() => navigate('/signup')} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<RedirectIfAuthed><Landing /></RedirectIfAuthed>} />
        <Route path="/signup" element={<RedirectIfAuthed><SignUp /></RedirectIfAuthed>} />
        <Route path="/signin" element={<RedirectIfAuthed><SignIn /></RedirectIfAuthed>} />
        <Route path="/forgot-password" element={<RedirectIfAuthed><ForgotPassword /></RedirectIfAuthed>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<InterestSelection />} />

        {/* Public, no auth required — Play Console links directly to these,
            and reviewers/users must be able to open them without the app. */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/delete-account-request" element={<DeleteAccountRequest />} />

        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/profile/followers" element={<FollowList type="followers" />} />
          <Route path="/profile/following" element={<FollowList type="following" />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/profile/:userId/followers" element={<FollowList type="followers" />} />
          <Route path="/profile/:userId/following" element={<FollowList type="following" />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/password" element={<ChangePassword />} />
          <Route path="/settings/account-type" element={<AccountType />} />
          <Route path="/settings/topics" element={<TopicsSettings />} />
          <Route path="/live/go" element={<LiveGo />} />
          <Route path="/live/:id" element={<LiveView />} />
          <Route path="/call/:conversationId/:mode" element={<Call />} />
          <Route path="/settings/insights/overview" element={<InsightsOverview />} />
          <Route path="/settings/insights/content" element={<InsightsContent />} />
          <Route path="/settings/insights/audience" element={<InsightsAudience />} />
          <Route path="/settings/insights/discovery" element={<InsightsDiscovery />} />
          <Route path="/settings/help" element={<HelpSupport />} />
          <Route path="/settings/blocked" element={<ManagedAccounts type="blocked" />} />
          <Route path="/settings/muted" element={<ManagedAccounts type="muted" />} />
          <Route path="/settings/about" element={<AboutApp />} />
          <Route path="/settings/notifications" element={<NotificationSettings />} />
          <Route path="/settings/privacy" element={<PrivacySettings />} />
          <Route path="/settings/appearance" element={<AppearanceSettings />} />
          <Route path="/settings/focus" element={<FocusMode />} />
          <Route path="/settings/muted-words" element={<MutedWords />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<ChatThread />} />
          <Route path="/coming-soon" element={<ComingSoon />} />
        </Route>

        <Route path="*" element={<Landing />} />
      </Routes>
    </Suspense>
  )
}
