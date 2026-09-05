// All data below is static seed/mock data used to power the frontend-only demo.
// Nothing here talks to a server — it's the "single source of truth" the
// AppContext copies into React state so the UI can be interacted with.

export const TOPICS = [
  { id: 'india-news', label: 'India News', emoji: '📰' },
  { id: 'technology', label: 'Technology', emoji: '💻' },
  { id: 'business', label: 'Business', emoji: '📈' },
  { id: 'sports', label: 'Sports', emoji: '🏏' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬' },
  { id: 'health', label: 'Health & Fitness', emoji: '🧘' },
  { id: 'education', label: 'Education', emoji: '📚' },
  { id: 'environment', label: 'Environment', emoji: '🌿' },
  { id: 'culture', label: 'Culture', emoji: '🪔' },
]

export const FEED_TABS = ['For You', 'Trending', 'India News', 'Tech', 'Culture']

export const HIGHLIGHTS = [
  { id: 'h1', label: 'Delhi Protest', sub: 'Today 10AM · India Gate', live: true, tone: 'from-bharat-red to-[#7A0E17]' },
  { id: 'h2', label: 'Tech Creators', sub: 'Top voices', live: false, tone: 'from-[#2B3A67] to-[#1A2754]' },
  { id: 'h3', label: 'Bharat Business', sub: 'Markets today', live: false, tone: 'from-navy-800 to-navy-950' },
  { id: 'h4', label: 'Fitness India', sub: 'Move with India', live: false, tone: 'from-saffron-500 to-saffron-700' },
]

export const TRENDING_TOPICS = [
  { id: 't1', tag: '#IndiaElection2024', posts: '2.4M posts', category: 'India News' },
  { id: 't2', tag: '#MakeInIndia', posts: '1.8M posts', category: 'Business' },
  { id: 't3', tag: '#SpaceIndia', posts: '1.2M posts', category: 'Technology' },
  { id: 't4', tag: '#ClimateAction', posts: '1.1M posts', category: 'Environment' },
  { id: 't5', tag: '#IndiaUnites', posts: '890K posts', category: 'Culture' },
  { id: 't6', tag: '#CricketFever', posts: '760K posts', category: 'Sports' },
]

export const LIVE_NOW = [
  {
    id: 'l1',
    title: 'ISRO Updates',
    subtitle: 'Historic Mission · Live from Sriharikota',
    watching: '248K watching',
    tone: 'from-[#1A2754] to-[#0B1330]',
    icon: 'rocket',
  },
  {
    id: 'l2',
    title: 'Cricket Fever',
    subtitle: 'India vs Australia · Live Match Updates',
    watching: '1.1M watching',
    tone: 'from-bharat-green to-bharat-greendark',
    icon: 'trophy',
  },
]

export const USERS = {
  pooja: {
    id: 'pooja',
    name: 'Pooja Sharma',
    handle: '@pooja.sharma',
    verified: true,
    avatarColor: 'from-saffron-400 to-saffron-600',
    initials: 'PS',
    location: 'New Delhi, India',
    joined: 'May 2024',
    bio: 'Tech · Innovation · India — Passionate about building a better India through technology, education and community action.',
    followers: 58400,
    following: 892,
    posts: 1200,
    topics: ['India News', 'Tech', 'Climate', 'Education'],
  },
  rohit: { id: 'rohit', name: 'Rohit Verma', handle: '@rohit.verma', verified: false, avatarColor: 'from-blue-400 to-blue-600', initials: 'RV' },
  ananya: { id: 'ananya', name: 'Ananya Singh', handle: '@ananya.singh', verified: false, avatarColor: 'from-pink-400 to-rose-600', initials: 'AS' },
  indiaToday: { id: 'indiaToday', name: 'India Today', handle: '@indiatoday', verified: true, avatarColor: 'from-bharat-red to-red-800', initials: 'IT' },
  vikram: { id: 'vikram', name: 'Vikram Joshi', handle: '@vikram.joshi', verified: false, avatarColor: 'from-emerald-400 to-emerald-700', initials: 'VJ' },
  techBharat: { id: 'techBharat', name: 'Tech Bharat', handle: '@techbharat', verified: true, avatarColor: 'from-indigo-400 to-indigo-700', initials: 'TB' },
  meera: { id: 'meera', name: 'Meera Nair', handle: '@meera.nair', verified: false, avatarColor: 'from-amber-400 to-orange-600', initials: 'MN' },
  arjun: { id: 'arjun', name: 'Arjun Rao', handle: '@arjun.rao', verified: true, avatarColor: 'from-teal-400 to-cyan-700', initials: 'AR' },
  wanderAditi: { id: 'wanderAditi', name: 'WanderWithAditi', handle: '@wanderwithaditi', verified: true, avatarColor: 'from-teal-400 to-cyan-700', initials: 'WA' },
  natureLens: { id: 'natureLens', name: 'Nature Lens', handle: '@naturelens', verified: false, avatarColor: 'from-lime-400 to-green-700', initials: 'NL' },
  globalVoices: { id: 'globalVoices', name: 'Global Voices', handle: '@globalvoices', verified: true, avatarColor: 'from-navy-700 to-navy-950', initials: 'GV' },
  startupIndia: { id: 'startupIndia', name: 'Startup Circle', handle: '@startupcircle', verified: true, avatarColor: 'from-emerald-400 to-bharat-green', initials: 'SC' },
}

export const INITIAL_POSTS = [
  {
    id: 'p1',
    authorId: 'pooja',
    time: '2h ago',
    tab: 'For You',
    tags: ['India News', 'Culture'],
    text: "Incredible crowd at India Gate today! People from across India coming together for a stronger, fairer future. #IndiaUnites",
    hasImage: true,
    imageTone: 'sunset-arch',
    live: true,
    likes: 12400,
    comments: 1200,
    reposts: 532,
    comments_list: [
      { id: 'c1', authorId: 'rohit', text: 'This is what unity looks like. Proud moment 🇮🇳', time: '1h ago' },
      { id: 'c2', authorId: 'ananya', text: 'Wish I could have been there in person!', time: '45m ago' },
    ],
  },
  {
    id: 'p2',
    authorId: 'techBharat',
    time: '4h ago',
    tab: 'Tech',
    tags: ['Technology', 'Business'],
    text: "ISRO's next mission is set to launch this week from Sriharikota — another milestone for India's space programme. Full mission breakdown in the thread below. 🚀",
    hasImage: false,
    likes: 8900,
    comments: 640,
    reposts: 1500,
    comments_list: [
      { id: 'c3', authorId: 'arjun', text: "Been following ISRO's work for years, this is huge.", time: '3h ago' },
    ],
  },
  {
    id: 'p3',
    authorId: 'indiaToday',
    time: '6h ago',
    tab: 'India News',
    tags: ['India News'],
    text: "Important discussion on India's next growth decade — economists weigh in on manufacturing, digital infrastructure and skilling. Read the full report on our site.",
    hasImage: false,
    likes: 3200,
    comments: 410,
    reposts: 298,
    comments_list: [],
  },
  {
    id: 'p4',
    authorId: 'meera',
    time: '8h ago',
    tab: 'Culture',
    tags: ['Culture', 'Education'],
    text: "Spent the weekend at a classical dance workshop in Chennai — watching centuries-old Bharatanatyam traditions passed on to a new generation is pure magic. ✨",
    hasImage: false,
    likes: 5400,
    comments: 320,
    reposts: 210,
    comments_list: [],
  },
  {
    id: 'p5',
    authorId: 'vikram',
    time: '10h ago',
    tab: 'For You',
    tags: ['Sports'],
    text: "What a match! India vs Australia is going right down to the wire. Stadium is absolutely electric right now 🏏🔥",
    hasImage: false,
    live: true,
    likes: 15600,
    comments: 2100,
    reposts: 890,
    comments_list: [],
  },
  {
    id: 'p6',
    authorId: 'arjun',
    time: '1d ago',
    tab: 'Trending',
    tags: ['Environment', 'Technology'],
    text: "Small actions, big impact 🌱 Let's make India greener, cleaner and stronger — our community tree-planting drive crossed 10,000 saplings this month!",
    hasImage: false,
    likes: 4100,
    comments: 260,
    reposts: 175,
    comments_list: [],
  },
]

// Geographic discovery — per the "don't force India into every screen"
// direction: topics stay subject-first (see TOPICS above), and geography
// is a separate, optional lens rather than the app's primary axis.
export const GEO_REGIONS = [
  { id: 'india', label: 'India' },
  { id: 'asia', label: 'Asia' },
  { id: 'africa', label: 'Africa' },
  { id: 'europe', label: 'Europe' },
  { id: 'middle-east', label: 'Middle East' },
  { id: 'americas', label: 'Americas' },
  { id: 'world', label: 'World' },
]

export const DISCOVER_TABS = ['Top', 'News', 'Tech', 'Business', 'Culture', 'Sports']

// Fictional accounts only — see docs/CONNECT_EXISTING_INFRA.md. Real named
// public figures are never depicted as platform users/followers here.
export const SUGGESTED_ACCOUNTS = [
  { id: 'globalVoices', name: 'Global Voices', handle: '@globalvoices', verified: true, avatarColor: 'from-navy-700 to-navy-950', initials: 'GV', bio: 'Cross-cultural stories, curated daily.', category: 'Media & Publisher' },
  { id: 'wanderAditi', name: 'WanderWithAditi', handle: '@wanderwithaditi', verified: true, avatarColor: 'from-teal-400 to-cyan-700', initials: 'WA', bio: 'Travel creator · 40 countries and counting.', category: 'Creator' },
  { id: 'startupIndia', name: 'Startup Circle', handle: '@startupcircle', verified: true, avatarColor: 'from-emerald-400 to-bharat-green', initials: 'SC', bio: 'Founders, funding, and first principles.', category: 'Community' },
  { id: 'natureLens', name: 'Nature Lens', handle: '@naturelens', verified: false, avatarColor: 'from-lime-400 to-green-700', initials: 'NL', bio: 'Wildlife and climate photography.', category: 'Creator' },
]

export const COMMUNITIES = [
  { id: 'com1', name: 'Tech Innovators India', members: 124000, tone: 'from-indigo-400 to-indigo-700', joined: false, category: 'Technology' },
  { id: 'com2', name: 'Startup India', members: 98000, tone: 'from-emerald-400 to-bharat-green', joined: false, category: 'Business' },
  { id: 'com3', name: 'Photography Global', members: 256000, tone: 'from-amber-400 to-orange-600', joined: true, category: 'Culture' },
  { id: 'com4', name: 'Travel & Explore', members: 310000, tone: 'from-teal-400 to-cyan-700', joined: false, category: 'Travel' },
  { id: 'com5', name: 'Climate Action', members: 87000, tone: 'from-lime-400 to-green-700', joined: false, category: 'Environment' },
  { id: 'com6', name: 'Cricket Fever', members: 412000, tone: 'from-bharat-green to-bharat-greendark', joined: true, category: 'Sports' },
]

export const CONVERSATIONS = [
  { id: 'msg1', authorId: 'ananya', preview: 'See you at the event!', time: '5m', unread: 2 },
  { id: 'msg2', authorId: 'techBharat', preview: 'Shared a link', time: '2h', unread: 0 },
  { id: 'msg3', authorId: 'rohit', preview: 'Great discussion today!', time: '4h', unread: 0 },
  { id: 'msg4', authorId: 'meera', preview: '12 new messages', time: '5h', unread: 12 },
  { id: 'msg5', authorId: 'vikram', preview: "Let's collaborate soon.", time: '2d', unread: 0 },
]

// Vertical short-form feed. `tone` stands in for a real video background
// the same way HIGHLIGHTS/LIVE_NOW above already use a gradient in place
// of real media — no video files/streaming involved.
export const REELS = [
  { id: 'r1', authorId: 'wanderAditi', tone: 'from-[#4A2A6B] via-[#A83E5A] to-[#0B1330]', caption: 'Lost in the Himalayas — finding peace in the clouds. #IncredibleIndia #Travel', likes: 246000, comments: 3421, shares: 12800 },
  { id: 'r2', authorId: 'techBharat', tone: 'from-indigo-700 via-indigo-900 to-navy-950', caption: '5 AI tools that will boost your productivity in 2024', likes: 89400, comments: 1204, shares: 3100 },
  { id: 'r3', authorId: 'natureLens', tone: 'from-emerald-600 via-emerald-900 to-navy-950', caption: 'Golden hour in the Serengeti 🌍', likes: 156000, comments: 2210, shares: 5400 },
  { id: 'r4', authorId: 'meera', tone: 'from-amber-500 via-orange-700 to-navy-950', caption: 'Bharatanatyam rehearsal — centuries-old tradition, new generation ✨', likes: 62300, comments: 890, shares: 1200 },
]

export const INITIAL_NOTIFICATIONS = [
  { id: 'n1', type: 'Mentions', authorId: 'rohit', text: 'mentioned you in a post: "Great perspective on India\'s green energy future!"', time: '2m ago', unread: true },
  { id: 'n2', type: 'Reactions', authorId: 'ananya', text: 'liked your post: "Love this! India\'s youth is creating amazing change."', time: '12m ago', unread: true },
  { id: 'n3', type: 'Reactions', authorId: 'indiaToday', text: 'shared your post: "Important discussion on India\'s next growth decade."', time: '1h ago', unread: true },
  { id: 'n4', type: 'Follows', authorId: 'techBharat', text: 'followed you', time: '3h ago', unread: false },
  { id: 'n5', type: 'Comments', authorId: 'vikram', text: 'commented on your post: "Well said! Looking forward to more such insights."', time: '5h ago', unread: false },
  { id: 'n6', type: 'Mentions', authorId: 'meera', text: 'mentioned you in a comment on the India Gate post', time: '1d ago', unread: false },
]
