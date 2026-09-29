/**
 * commentController.js
 * Architectural Role: Threaded Comment System.
 * Supports top-level comments and one-level-deep replies.
 * Notifications fire on new comment/reply.
 */
const { getServiceClient } = require('../config/supabase')

// GET /api/comments/:postId — Get all comments + replies for a post
exports.getComments = async (req, res) => {
  const supabase = getServiceClient()
  const { postId } = req.params

  // Fetch top-level comments with author profile
  const { data: topLevel, error } = await supabase.from('comments')
    .select('*, author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)')
    .eq('post_id', postId)
    .is('parent_id', null)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  // Fetch replies for each comment
  const enriched = await Promise.all(topLevel.map(async (c) => {
    const { data: replies } = await supabase.from('comments')
      .select('*, author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)')
      .eq('parent_id', c.id)
      .order('created_at', { ascending: true })
    return { ...c, replies: replies || [] }
  }))

  res.json({ comments: enriched })
}

// POST /api/comments — Add a comment or reply
exports.addComment = async (req, res) => {
  const supabase = getServiceClient()
  const { post_id, body, parent_id } = req.body

  if (!post_id || !body) return res.status(400).json({ error: 'post_id and body are required.' })

  const { data: comment, error } = await supabase.from('comments')
    .insert({
      user_id: req.user.id,
      post_id,
      body,
      parent_id: parent_id || null
    })
    .select('*, author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url)')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Notify post creator
  const { data: post } = await supabase.from('posts').select('creator_id').eq('id', post_id).single()
  if (post && post.creator_id !== req.user.id) {
    await supabase.from('notifications').insert({
      recipient_id: post.creator_id,
      actor_id: req.user.id,
      type: parent_id ? 'reply' : 'comment',
      content_id: post_id,
    })
  }

  // Update comments_count on post
  await supabase.rpc('increment_comments', { post_id_input: post_id })

  res.status(201).json({ comment })
}

// POST /api/comments/:id/like — Like a comment
exports.likeComment = async (req, res) => {
  const supabase = getServiceClient()
  const commentId = req.params.id

  const { data: existing } = await supabase.from('likes')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('content_id', commentId)
    .eq('content_type', 'comment')
    .single()

  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id)
    return res.json({ liked: false })
  }

  await supabase.from('likes').insert({ user_id: req.user.id, content_id: commentId, content_type: 'comment' })
  res.json({ liked: true })
}
