import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import SignUp from './pages/SignUp.jsx'
import SignIn from './pages/SignIn.jsx'
import InterestSelection from './pages/InterestSelection.jsx'
import Home from './pages/Home.jsx'
import Discover from './pages/Discover.jsx'
import CreatePost from './pages/CreatePost.jsx'
import Activity from './pages/Activity.jsx'
import Profile from './pages/Profile.jsx'
import EditProfile from './pages/EditProfile.jsx'
import PostDetail from './pages/PostDetail.jsx'
import AppLayout from './components/AppLayout.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/onboarding" element={<InterestSelection />} />

      <Route element={<AppLayout />}>
        <Route path="/home" element={<Home />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/create" element={<CreatePost />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/post/:id" element={<PostDetail />} />
      </Route>

      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
