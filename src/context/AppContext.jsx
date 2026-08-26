import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { INITIAL_NOTIFICATIONS, INITIAL_POSTS, USERS } from '../data/mockData.js'

const AppContext = createContext(null)

let idCounter = 1000
const nextId = (prefix) => `${prefix}-${idCounter++}`

export function AppProvider({ children }) {
  // --- auth (formality only, nothing is verified) ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasOnboarded, setHasOnboarded] = useState(false)

  // the signed-in user is always "Pooja Sharma" from the mockup profile screen
  const [currentUser, setCurrentUser] = useState({ ...USERS.pooja })

  // --- content state ---
  const [posts, setPosts] = useState(INITIAL_POSTS)
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [likedPostIds, setLikedPostIds] = useState(new Set())
  const [savedPostIds, setSavedPostIds] = useState(new Set())
  const [followedUserIds, setFollowedUserIds] = useState(new Set())
  const [selectedTopics, setSelectedTopics] = useState([])

  // --- ephemeral UI state ---
  const [toasts, setToasts] = useState([])

  const pushToast = useCallback((message) => {
    const id = nextId('toast')
    setToasts((t) => [...t, { id, message }])
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, 2600)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id))
  }, [])

  const signUp = useCallback((profile) => {
    setCurrentUser((u) => ({ ...u, ...profile }))
    setIsAuthenticated(true)
  }, [])

  const signIn = useCallback(() => {
    setIsAuthenticated(true)
  }, [])

  const signOut = useCallback(() => {
    setIsAuthenticated(false)
    setHasOnboarded(false)
  }, [])

  const completeOnboarding = useCallback((topics) => {
    setSelectedTopics(topics)
    setHasOnboarded(true)
  }, [])

  const toggleLike = useCallback((postId) => {
    setLikedPostIds((prev) => {
      const next = new Set(prev)
      const liked = next.has(postId)
      if (liked) next.delete(postId)
      else next.add(postId)
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p
        )
      )
      return next
    })
  }, [])

  const toggleSave = useCallback((postId) => {
    setSavedPostIds((prev) => {
      const next = new Set(prev)
      const saved = next.has(postId)
      if (saved) next.delete(postId)
      else next.add(postId)
      pushToast(saved ? 'Removed from saved' : 'Saved to your bookmarks')
      return next
    })
  }, [pushToast])

  const repost = useCallback((postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => (p.id === postId ? { ...p, reposts: p.reposts + 1 } : p))
    )
    pushToast('Reposted to your profile')
  }, [pushToast])

  const addComment = useCallback((postId, text) => {
    if (!text.trim()) return
    const comment = { id: nextId('c'), authorId: currentUser.id, text: text.trim(), time: 'now' }
    setPosts((prevPosts) =>
      prevPosts.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments + 1, comments_list: [...p.comments_list, comment] }
          : p
      )
    )
  }, [currentUser.id])

  const toggleFollow = useCallback((userId) => {
    setFollowedUserIds((prev) => {
      const next = new Set(prev)
      const following = next.has(userId)
      if (following) next.delete(userId)
      else next.add(userId)
      const user = USERS[userId]
      pushToast(following ? `Unfollowed ${user?.name ?? 'user'}` : `Following ${user?.name ?? 'user'}`)
      return next
    })
  }, [pushToast])

  const createPost = useCallback((text, options = {}) => {
    const post = {
      id: nextId('p'),
      authorId: currentUser.id,
      time: 'now',
      tab: 'For You',
      tags: options.tags ?? [],
      text: text.trim(),
      hasImage: !!options.hasImage,
      imagePreview: options.imagePreview ?? null,
      likes: 0,
      comments: 0,
      reposts: 0,
      comments_list: [],
    }
    setPosts((prev) => [post, ...prev])
    pushToast('Post published')
    return post
  }, [currentUser.id, pushToast])

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  )

  const updateProfile = useCallback((updates) => {
    setCurrentUser((u) => ({ ...u, ...updates }))
    pushToast('Profile updated')
  }, [pushToast])

  const getUser = useCallback(
    (userId) => (userId === currentUser.id ? currentUser : USERS[userId]),
    [currentUser]
  )

  const value = {
    isAuthenticated,
    hasOnboarded,
    currentUser,
    posts,
    notifications,
    likedPostIds,
    savedPostIds,
    followedUserIds,
    selectedTopics,
    toasts,
    signUp,
    signIn,
    signOut,
    completeOnboarding,
    toggleLike,
    toggleSave,
    repost,
    addComment,
    toggleFollow,
    createPost,
    markNotificationsRead,
    unreadCount,
    updateProfile,
    getUser,
    pushToast,
    dismissToast,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
