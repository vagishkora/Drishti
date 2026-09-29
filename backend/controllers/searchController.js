/**
 * searchController.js
 * Architectural Role: Discovery & Search System.
 * Searches users by username/name. Returns explore feed of public content.
 */
const { getServiceClient } = require('../config/supabase')

// GET /api/search?q= — Search users by username or full_name
exports.searchUsers = async (req, res) => {
  const supabase = getServiceClient()
  const q = (req.query.q || '').trim()

  if (!q) return res.json({ users: [] })

  const { data, error } = await supabase.from('profiles')
    .select('id, username, full_name, avatar_url, account_type')
    .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
    .limit(20)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ users: data })
}

// GET /api/search/explore — Trending/random public posts
exports.getExplore = async (req, res) => {
  const supabase = getServiceClient()
  const page = parseInt(req.query.page) || 1
  const limit = 24
  const offset = (page - 1) * limit

  const { data, error } = await supabase.from('posts')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('is_premium', false)
    .order('views_count', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })

  // Generate signed URLs
  const enriched = await Promise.all(data.map(async (p) => {
    const { data: urlData } = await supabase.storage.from('posts').createSignedUrl(p.media_url, 3600)
    return { ...p, signed_url: urlData?.signedUrl || null }
  }))

  res.json({ posts: enriched, page })
}

// GET /api/search/suggested — Suggested users to follow
exports.getSuggested = async (req, res) => {
  const supabase = getServiceClient()

  // Get users the current user already follows
  let excludeIds = [req.user.id]
  if (req.user) {
    const { data: follows } = await supabase.from('follows')
      .select('following_id')
      .eq('follower_id', req.user.id)
    excludeIds = [...excludeIds, ...(follows || []).map(f => f.following_id)]
  }

  const { data: suggested } = await supabase.from('profiles')
    .select('id, username, full_name, avatar_url, account_type')
    .not('id', 'in', `(${excludeIds.join(',')})`)
    .eq('account_type', 'creator')
    .limit(8)

  res.json({ suggested: suggested || [] })
}

// GET /api/search/profile/:userId — Get public profile + stats
exports.getProfile = async (req, res) => {
  const supabase = getServiceClient()
  const { userId } = req.params

  const { data: profile, error } = await supabase.from('profiles')
    .select('id, username, full_name, avatar_url, bio, website, account_type, is_private')
    .eq('id', userId)
    .single()

  if (error) return res.status(404).json({ error: 'Profile not found.' })

  // Count stats in parallel
  const [{ count: postsCount }, { count: followersCount }, { count: followingCount }, { count: subscribersCount }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('creator_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('creator_id', userId).eq('status', 'active'),
  ])

  res.json({
    profile: {
      ...profile,
      stats: {
        posts: postsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
        subscribers: subscribersCount || 0,
      }
    }
  })
}
