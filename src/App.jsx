import React, { useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Welcome from './pages/Welcome.jsx'
import SignUp from './pages/SignUp.jsx'
import SignIn from './pages/SignIn.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import InterestSelection from './pages/InterestSelection.jsx'
import Home from './pages/Home.jsx'
import Discover from './pages/Discover.jsx'
import CreatePost from './pages/CreatePost.jsx'
import Activity from './pages/Activity.jsx'
import Profile from './pages/Profile.jsx'
import EditProfile from './pages/EditProfile.jsx'
import Settings from './pages/Settings.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import ManagedAccounts from './pages/ManagedAccounts.jsx'
import PostDetail from './pages/PostDetail.jsx'
import Reels from './pages/Reels.jsx'
import Communities from './pages/Communities.jsx'
import Messages from './pages/Messages.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Privacy from './pages/Privacy.jsx'
import Terms from './pages/Terms.jsx'
import DeleteAccountRequest from './pages/DeleteAccountRequest.jsx'
import AppLayout from './components/AppLayout.jsx'
import LaunchSplash from './components/LaunchSplash.jsx'
import { useApp } from './context/AppContext.jsx'

// Keeps a signed-in user from landing back on the marketing/auth screens —
// e.g. hitting "/" or "/signin" directly with a saved session still active.
function RedirectIfAuthed({ children }) {
  const { isAuthenticated } = useApp()
  if (isAuthenticated) return <Navigate to="/home" replace />
  return children
}

export default function App() {
  const { authLoading, isAuthenticated } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [introTimerDone, setIntroTimerDone] = useState(false)

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
    return <Welcome onDone={() => navigate('/signup')} />
  }

  return (
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
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/password" element={<ChangePassword />} />
        <Route path="/settings/blocked" element={<ManagedAccounts type="blocked" />} />
        <Route path="/settings/muted" element={<ManagedAccounts type="muted" />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/communities" element={<Communities />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/coming-soon" element={<ComingSoon />} />
      </Route>

      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
