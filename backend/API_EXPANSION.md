// Backend API endpoints for new features

// ============ STORIES API ============

// POST /v1/stories - Create a new story
// Body: { content, mediaUrl?, mediaType?, duration? }
// Response: { id, userId, content, mediaUrl, createdAt, expiresAt }

// GET /v1/stories - Get user's stories feed
// Query: ?limit=10&offset=0
// Response: { stories: [...], hasMore: boolean }

// GET /v1/stories/:userId - Get specific user's stories
// Response: { stories: [...] }

// GET /v1/stories/:storyId/views - Get story view count
// Response: { viewsCount: number, viewers: [...] }

// POST /v1/stories/:storyId/view - Mark story as viewed
// Response: { success: true, viewedAt }

// DELETE /v1/stories/:storyId - Delete own story
// Response: { success: true }

// ============ COLLECTIONS API ============

// POST /v1/collections - Create new collection
// Body: { name, description?, isPrivate? }
// Response: { id, userId, name, description, createdAt }

// GET /v1/collections - Get user's collections
// Response: { collections: [...] }

// GET /v1/collections/:collectionId - Get collection details with posts
// Response: { id, name, description, posts: [...] }

// PATCH /v1/collections/:collectionId - Update collection
// Body: { name?, description?, isPrivate? }
// Response: { success: true, collection: {...} }

// POST /v1/collections/:collectionId/posts/:postId - Add post to collection
// Response: { success: true, addedAt }

// DELETE /v1/collections/:collectionId/posts/:postId - Remove post from collection
// Response: { success: true }

// DELETE /v1/collections/:collectionId - Delete collection
// Response: { success: true }

// ============ HASHTAGS & TRENDING API ============

// GET /v1/hashtags/trending - Get trending hashtags
// Query: ?limit=10
// Response: { hashtags: [{ tag, usageCount, trendingScore }, ...] }

// GET /v1/hashtags/:tag - Get posts with hashtag
// Query: ?limit=20&offset=0
// Response: { tag, posts: [...], postsCount: number }

// POST /v1/hashtags - Search/autocomplete hashtags
// Body: { query }
// Response: { suggestions: [...] }

// ============ DIRECT MESSAGING API ============

// POST /v1/conversations - Create/get conversation
// Body: { participantId }
// Response: { id, participant1Id, participant2Id, createdAt }

// GET /v1/conversations - Get user's conversations
// Response: { conversations: [...], unreadCount: number }

// GET /v1/conversations/:conversationId/messages - Get conversation messages
// Query: ?limit=50&offset=0
// Response: { messages: [...], hasMore: boolean }

// POST /v1/conversations/:conversationId/messages - Send message
// Body: { content, mediaUrl? }
// Response: { id, senderId, content, createdAt, isRead }

// PATCH /v1/conversations/:conversationId/messages/:messageId - Mark as read
// Response: { success: true }

// ============ USER PREFERENCES API ============

// GET /v1/users/me/preferences - Get user preferences
// Response: { theme, notificationsEnabled, emailNotifications, privateAccount, allowDm }

// PATCH /v1/users/me/preferences - Update preferences
// Body: { theme?, notificationsEnabled?, emailNotifications?, privateAccount?, allowDm? }
// Response: { success: true, preferences: {...} }

// ============ ACTIVITY LOG API ============

// GET /v1/users/me/activity - Get user activity log
// Query: ?limit=50&offset=0&action=&resource=
// Response: { activities: [...], hasMore: boolean }
