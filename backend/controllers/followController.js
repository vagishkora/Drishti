/**
 * followController.js
 * Architectural Role: Manages the Social Follow System.
 * Handles follow/unfollow actions and followers/following list retrieval.
 */
const { getServiceClient } = require('../config/supabase')

// Helper: create a notification for a follow event
const createFollowNotification = async (supabase, actorId, recipientId) => {
  await supabase.from('notifications').insert({
    recipient_id: recipientId,
    actor_id: actorId,
    type: 'follow',
  })
}

// POST /api/follows/:userId — Follow a user
exports.followUser = async (req, res) => {
  const supabase = getServiceClient()
  const followerId = req.user.id
  const followingId = req.params.userId

  if (followerId === followingId) {
    return res.status(400).json({ error: 'You cannot follow yourself.' })
  }

  const { error } = await supabase.from('follows').insert({
    follower_id: followerId,
    following_id: followingId,
  })

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Already following.' })
    return res.status(500).json({ error: error.message })
  }

  // Trigger notification (non-blocking)
  createFollowNotification(supabase, followerId, followingId)

  res.json({ success: true, message: 'Followed successfully.' })
}

// DELETE /api/follows/:userId — Unfollow a user
exports.unfollowUser = async (req, res) => {
  const supabase = getServiceClient()
  const followerId = req.user.id
  const followingId = req.params.userId

  const { error } = await supabase.from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ success: true, message: 'Unfollowed successfully.' })
}

// GET /api/follows/:userId/followers — Get followers list
exports.getFollowers = async (req, res) => {
  const supabase = getServiceClient()
  const { userId } = req.params
  const page = parseInt(req.query.page) || 1
  const limit = 20
  const offset = (page - 1) * limit

  const { data, error } = await supabase.from('follows')
    .select('follower_id, profiles!follows_follower_id_fkey(id, username, full_name, avatar_url, account_type)')
    .eq('following_id', userId)
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ followers: data.map(f => f.profiles), page })
}

// GET /api/follows/:userId/following — Get following list
exports.getFollowing = async (req, res) => {
  const supabase = getServiceClient()
  const { userId } = req.params
  const page = parseInt(req.query.page) || 1
  const limit = 20
  const offset = (page - 1) * limit

  const { data, error } = await supabase.from('follows')
    .select('following_id, profiles!follows_following_id_fkey(id, username, full_name, avatar_url, account_type)')
    .eq('follower_id', userId)
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })

  res.json({ following: data.map(f => f.profiles), page })
}

// GET /api/follows/check/:userId — Check if current user follows a user
exports.checkFollow = async (req, res) => {
  const supabase = getServiceClient()
  const { data } = await supabase.from('follows')
    .select('id')
    .eq('follower_id', req.user.id)
    .eq('following_id', req.params.userId)
    .single()

  res.json({ isFollowing: !!data })
}
