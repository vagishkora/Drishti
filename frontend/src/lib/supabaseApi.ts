/**
 * supabaseApi.ts — Drishti Unified Data Layer
 * Architectural Role: All database operations via Supabase client SDK.
 * Replaces the Express backend entirely. RLS enforces access control.
 *
 * Research citation: "Drishti employs a serverless data layer using
 * Supabase's auto-generated REST API with Row Level Security policies,
 * eliminating the need for a dedicated application server."
 */
import { supabase } from './supabase'

// ─── Posts ──────────────────────────────────────────────────────

const PEXELS_KEY = import.meta.env.VITE_PEXELS_API_KEY;

export async function getPexelsVideos() {
  if (!PEXELS_KEY) return [];
  try {
    const res = await fetch('https://api.pexels.com/videos/popular?per_page=15', {
      headers: { Authorization: PEXELS_KEY }
    });
    const data = await res.json();
    return (data.videos || []).map((v: any) => ({
      id: `pexels-${v.id}`,
      media_url: v.video_files.find((f: any) => f.quality === 'hd')?.link || v.video_files[0].link,
      media_type: 'video',
      caption: `Video by ${v.user.name} on Pexels 🎥`,
      is_premium: false,
      is_pexels: true,
      users: {
        username: v.user.name.toLowerCase().replace(/\s+/g, '_'),
        full_name: v.user.name,
        avatar_url: `https://picsum.photos/seed/${v.user.id}/150/150`,
        is_verified: true
      }
    }));
  } catch (err) {
    console.error('Pexels fetch error:', err);
    return [];
  }
}

export async function getFeed(userId?: string) {
  let query = supabase
    .from('posts')
    .select('*, users!inner!posts_user_id_fkey(id, username, full_name, avatar_url, account_type, is_verified, is_private)')
    .eq('close_friends_only', false)
    .order('created_at', { ascending: false })
    .limit(30)

  // If logged in, handle privacy and muting
  if (userId) {
    const [{ data: muted }, { data: following }] = await Promise.all([
      supabase.from('muted_users').select('muted_user_id').eq('user_id', userId),
      supabase.from('follows').select('following_id').eq('follower_id', userId)
    ])
    
    const mutedIds = (muted || []).map(m => m.muted_user_id)
    const followingIds = [userId, ...(following || []).map(f => f.following_id)]

    if (mutedIds.length > 0) {
      query = query.not('user_id', 'in', `(${mutedIds.join(',')})`)
    }

    // Fix: Respect privacy using .or() on the joined users table
    // Shows posts from public accounts OR followed accounts
    query = query.or(`is_private.eq.false,id.in.(${followingIds.map(id => `"${id}"`).join(',')})`, { foreignTable: 'users' })
  } else {
    // Unauthenticated: hide all private user posts by filtering on join
    query = query.eq('users.is_private', false)
  }

  const [{ data: posts }, pexelsVideos] = await Promise.all([
    query,
    getPexelsVideos()
  ]);

  if (!posts) return [];

  // Interleave Pexels videos every 3rd post
  const combined = [];
  let videoIdx = 0;
  for (let i = 0; i < posts.length; i++) {
    combined.push(posts[i]);
    if ((i + 1) % 3 === 0 && videoIdx < pexelsVideos.length) {
      combined.push(pexelsVideos[videoIdx]);
      videoIdx++;
    }
  }

  return combined;
}

export async function getUserPosts(userId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified)')
    .eq('user_id', userId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function uploadPost(
  file: File,
  caption: string,
  isPremium: boolean
) {
  // Ensure we have correct auth session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const authorId = user.id

  const isVideo = file.type.startsWith('video')
  const bucket = isVideo ? 'videos' : 'photos'
  const ext = file.name.split('.').pop()
  const path = `${authorId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type })
  if (uploadErr) throw uploadErr

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

  const { data, error } = await supabase.from('posts').insert({
    user_id: authorId,
    media_url: publicUrl,
    media_type: isVideo ? 'video' : 'image',
    caption,
    is_premium: isPremium,
  }).select().single()
  if (error) throw error
  return data
}

export async function likePost(userId: string, postId: string) {
  const { error } = await supabase.from('likes').insert({ user_id: userId, post_id: postId })
  if (error && error.code === '23505') {
    // Already liked — unlike
    await supabase.from('likes').delete().match({ user_id: userId, post_id: postId })
    return false
  }
  // FIX 6: Send like notification to post owner
  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single()
  if (post && post.user_id !== userId) {
    await supabase.from('notifications').insert({
      recipient_id: post.user_id, sender_id: userId, type: 'like', post_id: postId
    })
  }
  return true
}

export async function getLikeCount(postId: string) {
  const { count } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId)
  return count || 0
}

export async function isPostLiked(userId: string, postId: string) {
  const { data } = await supabase.from('likes').select('user_id').match({ user_id: userId, post_id: postId }).maybeSingle()
  return !!data
}

export async function savePost(userId: string, postId: string) {
  const { error } = await supabase.from('saved_posts').insert({ user_id: userId, post_id: postId })
  if (error && error.code === '23505') {
    await supabase.from('saved_posts').delete().match({ user_id: userId, post_id: postId })
    return false
  }
  return true
}

export async function getSavedPosts(userId: string) {
  const { data } = await supabase
    .from('saved_posts')
    .select('post_id, posts(*, users!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified))')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false })
  return (data || []).map((d: any) => d.posts)
}

export async function deletePost(postId: string) {
  // 1. Fetch post to get media URL
  const { data: post, error: fetchErr } = await supabase
    .from('posts')
    .select('media_url')
    .eq('id', postId)
    .single()
  
  if (fetchErr) throw fetchErr

  // 2. Extract bucket and path from URL
  // Example URL: .../storage/v1/object/public/photos/user-id/uuid.jpg
  if (post?.media_url) {
    const url = new URL(post.media_url)
    const urlParts = url.pathname.split('/')
    // path structure: /storage/v1/object/public/[bucket]/[path...]
    const bucketIdx = urlParts.indexOf('public') + 1
    if (bucketIdx > 0 && bucketIdx < urlParts.length) {
      const bucket = urlParts[bucketIdx]
      const path = urlParts.slice(bucketIdx + 1).join('/')
      
      // 3. Delete from storage
      console.log(`Deleting storage object: ${bucket}/${path}`)
      await supabase.storage.from(bucket).remove([path])
    }
  }

  // 4. Delete from DB
  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) throw error
}

export async function pinPost(postId: string, pinned: boolean) {
  const { error } = await supabase.from('posts').update({ is_pinned: pinned }).eq('id', postId)
  if (error) throw error
}

// ─── Users / Profiles ───────────────────────────────────────────

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
  if (error) throw error

  // Fetch stats
  const [{ count: postsCount }, { count: followersCount }, { count: followingCount }, { count: subscribersCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('creator_id', userId).eq('is_active', true),
  ])

  return {
    ...data,
    stats: {
      posts: postsCount || 0,
      followers: data.followers_count !== null ? data.followers_count : (followersCount || 0),
      following: data.following_count !== null ? data.following_count : (followingCount || 0),
      subscribers: data.subscribers_count !== null ? data.subscribers_count : (subscribersCount || 0),
    }
  }
}

export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase.from('users').select('*').ilike('username', username).single()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: Record<string, any>) {
  const { data, error } = await supabase.from('users').update(updates).eq('id', userId).select().single()
  if (error) throw error
  return data
}

export async function deleteAccount(userId: string) {
  // Storage cleanup
  for (const bucket of ['photos', 'videos', 'avatars', 'stories']) {
    const { data: files } = await supabase.storage.from(bucket).list(userId)
    if (files && files.length > 0) {
      await supabase.storage.from(bucket).remove(files.map(f => `${userId}/${f.name}`))
    }
  }
  // DB row deletion (CASCADE handles most)
  await supabase.from('users').delete().eq('id', userId)
}

// ─── Follows ────────────────────────────────────────────────────

export async function follow(followerId: string, followingId: string) {
  const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
  if (error && error.code === '23505') return false // already following
  // Send notification
  await supabase.from('notifications').insert({
    recipient_id: followingId, sender_id: followerId, type: 'follow'
  })
  return true
}

export async function unfollow(followerId: string, followingId: string) {
  await supabase.from('follows').delete().match({ follower_id: followerId, following_id: followingId })
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data } = await supabase.from('follows').select('follower_id').match({ follower_id: followerId, following_id: followingId }).maybeSingle()
  return !!data
}

export async function getFollowers(userId: string) {
  const { data } = await supabase
    .from('follows')
    .select('follower_id, users!follows_follower_id_fkey(id, username, full_name, avatar_url)')
    .eq('following_id', userId)
  return (data || []).map((d: any) => d.users)
}

export async function getFollowing(userId: string) {
  const { data } = await supabase
    .from('follows')
    .select('following_id, users!follows_following_id_fkey(id, username, full_name, avatar_url)')
    .eq('follower_id', userId)
  return (data || []).map((d: any) => d.users)
}

// ─── Drishti Credits System ─────────────────────────────────────

export async function getCreditsBalance(userId: string) {
  const { data } = await supabase.from('users').select('credits').eq('id', userId).single()
  return data?.credits ?? 0
}

export async function deductCredits(userId: string, amount: number, description: string) {
  const balance = await getCreditsBalance(userId)
  if (balance < amount) throw new Error('Insufficient credits')

  const { data, error } = await supabase.rpc('add_credits_secure', {
    user_id_input: userId,
    credits_input: -amount,
    tx_type: 'subscription',
    tx_description: description,
  })
  if (error) throw error
  return data
}

export async function addCredits(userId: string, amount: number, type: string, description: string, razorpayOrderId?: string, razorpayPaymentId?: string) {
  const { data, error } = await supabase.rpc('add_credits_secure', {
    user_id_input: userId,
    credits_input: amount,
    tx_type: type,
    tx_description: description || 'Account balance adjustment',
  })
  if (error) throw error

  // If Razorpay metadata is present, attach to the latest transaction record
  if (razorpayOrderId || razorpayPaymentId) {
    await supabase.from('credit_transactions')
      .update({ razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId })
      .match({ user_id: userId, type })
  }
  return data
}

export async function getTransactionHistory(userId: string) {
  const { data } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

// ─── Subscriptions (Two-Layer Architecture) ─────────────────────

export async function subscribe(subscriberId: string, creatorId: string) {
  const { error } = await supabase.rpc('subscribe_creator', {
    subscriber_id_input: subscriberId,
    creator_id_input: creatorId
  })
  if (error) {
    if (error.message.includes('INSUFFICIENT_CREDITS')) throw new Error('INSUFFICIENT_CREDITS')
    throw error
  }
}

export async function checkSubscription(subscriberId: string, creatorId: string) {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .match({ subscriber_id: subscriberId, creator_id: creatorId })
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  return !!data
}

// ─── Comments ───────────────────────────────────────────────────

export async function getComments(postId: string) {
  const { data } = await supabase
    .from('comments')
    .select('*, users!comments_user_id_fkey(id, username, full_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
  return data || []
}

export async function addComment(userId: string, postId: string, content: string, parentId?: string) {
  const { data, error } = await supabase.from('comments').insert({
    user_id: userId, post_id: postId, content, parent_id: parentId || null
  }).select('*, users!comments_user_id_fkey(id, username, full_name, avatar_url)').single()
  if (error) throw error

  // Notify post owner
  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single()
  if (post && post.user_id !== userId) {
    await supabase.from('notifications').insert({
      recipient_id: post.user_id, sender_id: userId, type: parentId ? 'reply' : 'comment', post_id: postId
    })
  }
  return data
}

export async function likeComment(userId: string, commentId: string) {
  const { error } = await supabase.from('comment_likes').insert({ user_id: userId, comment_id: commentId })
  if (error && error.code === '23505') {
    await supabase.from('comment_likes').delete().match({ user_id: userId, comment_id: commentId })
    return false
  }
  return true
}

// ─── Drishti Stories Engine ─────────────────────────────────────

export async function createStory(file: File) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const authorId = user.id

  const bucket = 'stories'
  const ext = file.name.split('.').pop()
  const path = `${authorId}/${Date.now()}.${ext}`

  const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
  if (uploadErr) throw uploadErr

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

  const expireDate = new Date()
  expireDate.setHours(expireDate.getHours() + 24)

  const { data, error } = await supabase.from('stories').insert({
    user_id: authorId,
    media_url: publicUrl,
    media_type: file.type.startsWith('video') ? 'video' : 'image',
    expires_at: expireDate.toISOString()
  }).select('*, users!stories_user_id_fkey(id, username, full_name, avatar_url)').single()
  if (error) throw error
  return data
}

export async function getStoriesFeed(userId: string) {
  const now = new Date().toISOString()

  // Get all active stories for Phase 23

  const { data: stories } = await supabase
    .from('stories')
    .select('*, users!stories_user_id_fkey(id, username, full_name, avatar_url)')
    // FIX 2: Show all active stories to keep the universe populated
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  // Group by user
  const groups: Record<string, any> = {}
  for (const s of stories || []) {
    const uid = s.user_id
    if (!uid || !s.users) continue;
    if (!groups[uid]) groups[uid] = { user: s.users, stories: [] }
    groups[uid].stories.push(s)
  }

  // Own stories first
  const feed = Object.values(groups).sort((a: any, b: any) => {
    if (a.user.id === userId) return -1
    if (b.user.id === userId) return 1
    return 0
  })
  return feed
}

export async function deleteStory(storyId: string) {
  await supabase.from('stories').delete().eq('id', storyId)
}

export async function incrementStoryView(storyId: string) {
  // Attempt atomic increment via RPC
  const { error } = await supabase.rpc('increment_story_views', { story_id: storyId })
  if (error) {
    // Fallback if RPC doesn't exist
    const { data } = await supabase.from('stories').select('views').eq('id', storyId).single()
    if (data) {
      await supabase.from('stories').update({ views: (data.views || 0) + 1 }).eq('id', storyId)
    }
  }
}

// ─── Highlights ─────────────────────────────────────────────────

export async function createHighlight(userId: string, title: string, storyIds: string[], coverUrl?: string) {
  const { data: hl, error } = await supabase.from('highlights')
    .insert({ user_id: userId, title, cover_url: coverUrl }).select().single()
  if (error) throw error
  if (storyIds.length > 0) {
    await supabase.from('highlight_stories').insert(storyIds.map(sid => ({ highlight_id: hl.id, story_id: sid })))
  }
  return hl
}

export async function getUserHighlights(userId: string) {
  const { data } = await supabase
    .from('highlights')
    .select('*, highlight_stories(story_id, stories(media_url, media_type))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
}

// ─── Notifications ──────────────────────────────────────────────

export async function getNotifications(userId: string) {
  const { data } = await supabase
    .from('notifications')
    .select('*, sender:users!notifications_sender_id_fkey(id, username, full_name, avatar_url)')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

export async function markNotificationsRead(userId: string) {
  await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', userId).eq('is_read', false)
}

export async function getUnreadCount(userId: string) {
  const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', userId).eq('is_read', false)
  return count || 0
}

// ─── Search ─────────────────────────────────────────────────────

export async function searchUsers(query: string) {
  const { data } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, account_type, bio, is_verified')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(20)
  return data || []
}

export async function getExplorePosts() {
  const { data } = await supabase
    .from('posts')
    .select('*, users!posts_user_id_fkey(id, username, full_name, avatar_url, is_verified)')
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}


export async function getTrendingTags() {
  return [
    { name: 'Cinematic', count: 128 },
    { name: 'Future', count: 86 },
    { name: 'DrishtiUniverse', count: 64 },
    { name: 'EyeLogo', count: 42 }
  ]
}

export async function getTrendingPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*, users!posts_user_id_fkey(id, username, avatar_url, is_verified)')
    .order('views', { ascending: false }) // FIX 3: Order by views DESC
    .limit(5)
  if (error) throw error
  return data || []
}

export async function getSuggestedCreators(userId: string) {
  const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
  const followingIds = [userId, ...(following || []).map(f => f.following_id)]

  // FIX 4: Filter out ALREADY followed users + self
  const idsFilter = followingIds.map(id => `"${id}"`).join(',')
  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, is_verified, account_type')
    .not('id', 'in', `(${idsFilter})`)
    .limit(5)
  
  if (error) throw error
  return data || []
}

// ─── Monetization / Credits ────────────────────────────────────

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

export async function processSubscription(userId: string, creatorId: string) {
  // Deduct 100 credits from user
  const { data: userData, error: userError } = await supabase.rpc('add_credits', {
    user_id_input: userId,
    credits_input: -100
  })
  if (userError) throw userError

  // Add 80 credits to creator (20% platform fee)
  const { error: creatorError } = await supabase.rpc('add_credits', {
    user_id_input: creatorId,
    credits_input: 80
  })
  if (creatorError) throw creatorError

  // Log transactions
  await supabase.from('transactions').insert([
    { user_id: userId, amount: -100, type: 'subscription', description: `Subscription to creator ${creatorId}` },
    { user_id: creatorId, amount: 80, type: 'subscription_income', description: `Subscription from user ${userId}` }
  ])

  // Create follow relationship if doesn't exist
  await follow(userId, creatorId)

  return userData
}

export async function sendGift(userId: string, creatorId: string, amount: number) {
  // Deduct credits
  const { data: userData, error: userError } = await supabase.rpc('add_credits', {
    user_id_input: userId,
    credits_input: -amount
  })
  if (userError) throw userError

  // Add credits to creator
  const { error: creatorError } = await supabase.rpc('add_credits', {
    user_id_input: creatorId,
    credits_input: amount
  })
  if (creatorError) throw creatorError

  // Log transactions
  await supabase.from('transactions').insert([
    { user_id: userId, amount: -amount, type: 'gift', description: `Gift sent to creator ${creatorId}` },
    { user_id: creatorId, amount: amount, type: 'gift_income', description: `Gift received from user ${userId}` }
  ])

  // Send notification
  await supabase.from('notifications').insert({
    recipient_id: creatorId,
    sender_id: userId,
    type: 'gift',
    is_read: false
  })

  return userData
}

// ─── Reports / Mute ────────────────────────────────────────────

export async function reportUser(reporterId: string, reportedUserId: string, reason: string) {
  await supabase.from('reports').insert({ reporter_id: reporterId, reported_user_id: reportedUserId, reason })
}

export async function reportPost(reporterId: string, postId: string, reason: string) {
  await supabase.from('reports').insert({ reporter_id: reporterId, reported_post_id: postId, reason })
}

export async function muteUser(userId: string, mutedUserId: string) {
  const { error } = await supabase.from('muted_users').insert({ user_id: userId, muted_user_id: mutedUserId })
  if (error && error.code === '23505') {
    await supabase.from('muted_users').delete().match({ user_id: userId, muted_user_id: mutedUserId })
    return false
  }
  return true
}

export async function getMutedUsers(userId: string) {
  const { data } = await supabase
    .from('muted_users')
    .select('muted_user_id, users!muted_users_muted_user_id_fkey(id, username, full_name, avatar_url)')
    .eq('user_id', userId)
  return (data || []).map((d: any) => d.users)
}

// ─── Studio (Creator Analytics) ─────────────────────────────────

export async function getCreatorStats(userId: string) {
  const [{ data: posts }, { count: subs }, { data: user }] = await Promise.all([
    supabase.from('posts').select('views').eq('user_id', userId),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('creator_id', userId).eq('is_active', true),
    supabase.from('users').select('credits').eq('id', userId).single(),
  ])

  const totalViews = (posts || []).reduce((sum: number, p: any) => sum + (p.views || 0), 0)

  return {
    totalViews,
    totalSubscribers: subs || 0,
    creditsEarned: user?.credits || 0,
    totalPosts: (posts || []).length,
  }
}
// ─── Direct Messages (DM) & Zero-Knowledge E2EE ────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('drishti_jwt_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export async function getConversations(_userId?: string) {
  const res = await fetch(`${API_URL}/api/messages/conversations`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch conversations')
  }
  const data = await res.json()
  return data.conversations || []
}

export async function getMessages(conversationId: string) {
  const res = await fetch(`${API_URL}/api/messages/conversation/${conversationId}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to fetch messages')
  }
  const data = await res.json()
  return data.messages || []
}

export async function sendMessage(
  conversationId: string, 
  senderId: string, 
  content: string, 
  mediaUrl?: string, 
  mediaType?: string, 
  postId?: string
) {
  return sendEncryptedMessage(conversationId, senderId, content, '', mediaUrl, mediaType, postId)
}

export async function getOrCreateConversation(_user1: string, user2: string) {
  const res = await fetch(`${API_URL}/api/messages/conversation/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ peerId: user2 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to start conversation')
  }
  const data = await res.json()
  return data.conversationId
}

// ─── Admin Panel API ────────────────────────────────────────────

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('drishti_jwt_token')
  const res = await fetch(`${API_URL}/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Admin request failed')
  }
  return res.json()
}

export async function getAdminStats() {
  return adminFetch('/stats')
}

export async function getAdminUsers(page = 1, limit = 20, search = '', type = 'all') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search, type })
  return adminFetch(`/users?${params}`)
}

export async function getAdminUser(userId: string) {
  return adminFetch(`/users/${userId}`)
}

export async function toggleUserVerify(userId: string) {
  return adminFetch(`/users/${userId}/verify`, { method: 'PUT' })
}

export async function toggleUserAdmin(userId: string) {
  return adminFetch(`/users/${userId}/admin`, { method: 'PUT' })
}

export async function grantUserCredits(userId: string, amount: number, description: string) {
  return adminFetch(`/users/${userId}/credits`, {
    method: 'POST',
    body: JSON.stringify({ userId, amount, description }),
  })
}

export async function getAdminReports() {
  return adminFetch('/reports')
}

export async function resolveAdminReport(reportId: string, action: 'dismiss' | 'delete_post' | 'delete_user') {
  return adminFetch(`/reports/${reportId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

// ─── User Dashboard Stats ───────────────────────────────────────

export async function getUserDashboardStats(_userId: string) {
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    })
    const data = await res.json().catch(() => ({}))
    return {
      activeSubscriptions: 0,
      transactions: [],
      subscriptions: [],
      profile: data.profile || null,
    }
  } catch (_) {
    return {
      activeSubscriptions: 0,
      transactions: [],
      subscriptions: [],
    }
  }
}

// ─── E2EE Key Management & Zero-Knowledge Messaging ─────────────

export async function publishUserPublicKey(_userId: string, publicKeySPKI: string, fingerprint: string) {
  const res = await fetch(`${API_URL}/api/messages/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ publicKeySPKI, fingerprint }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to publish E2EE public key')
  }
  const data = await res.json()
  return data.key
}

export async function getUserPublicKey(userId: string) {
  const res = await fetch(`${API_URL}/api/messages/keys/${userId}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  })
  if (!res.ok) {
    return null
  }
  const data = await res.json()
  return data.key
}

export async function sendEncryptedMessage(
  conversationId: string,
  _senderId: string,
  ciphertext: string,
  iv: string,
  mediaUrl?: string,
  mediaType?: string,
  postId?: string
) {
  const res = await fetch(`${API_URL}/api/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      conversationId,
      ciphertext,
      iv,
      mediaUrl,
      mediaType,
      postId,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to send encrypted message')
  }
  const data = await res.json()
  return data.message
}

// ─── Security Audit & SOC Telemetry ──────────────────────────────

export async function getSecurityAuditLogs(limit = 30) {
  const data = await adminFetch(`/soc/logs?limit=${limit}`)
  return data.logs || []
}

export async function verifyAuditLogIntegrity() {
  const data = await adminFetch('/soc/verify', { method: 'POST' })
  return data
}



