/**
 * postController.js
 * Architectural Role: Unified Post Ingestion Pipeline.
 * Handles photo and video uploads to Supabase Storage.
 * Bug fix: Videos → 'videos' bucket, Photos → 'photos' bucket.
 * Smart feed: followers-first, demo content fallback.
 */
const { v4: uuidv4 } = require('uuid')
const { getServiceClient } = require('../config/supabase')

const MIN_FOLLOWED_POSTS = 5
const BUCKET_MAP = { video: 'videos', photo: 'photos' }

// POST /api/posts/upload — Upload photo or video to correct bucket
exports.uploadPost = async (req, res) => {
  const supabase = getServiceClient()
  const { title, description, is_premium, close_friends_only } = req.body

  if (!req.file) return res.status(400).json({ error: 'No media file uploaded.' })
  if (!title) return res.status(400).json({ error: 'Title is required.' })

  const type = req.file.mimetype.startsWith('video') ? 'video' : 'photo'
  const bucket = BUCKET_MAP[type]
  const ext = req.file.originalname.split('.').pop()
  const fileName = `${req.user.id}/${uuidv4()}.${ext}`

  // Upload to the correct bucket
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false })

  if (uploadError) return res.status(500).json({ error: uploadError.message })

  // Insert metadata with bucket reference
  const { data: post, error: dbError } = await supabase.from('posts')
    .insert({
      creator_id: req.user.id,
      type,
      title,
      description,
      media_url: fileName,
      storage_bucket: bucket,
      is_premium: is_premium === 'true',
      close_friends_only: close_friends_only === 'true',
    })
    .select('*, profiles(username, full_name, avatar_url)')
    .single()

  if (dbError) return res.status(500).json({ error: dbError.message })

  // Generate signed URL for immediate preview response
  const { data: urlData } = await supabase.storage.from(bucket).createSignedUrl(fileName, 3600)

  res.json({ success: true, post: { ...post, signed_url: urlData?.signedUrl || null } })
}


// GET /api/posts/feed — Smart feed (followed > demo fallback)
exports.getFeed = async (req, res) => {
  const supabase = getServiceClient()
  const page = parseInt(req.query.page) || 1
  const limit = 20
  const offset = (page - 1) * limit

  // 1. Get IDs of users the current user follows
  let followedIds = []
  if (req.user) {
    const { data: follows } = await supabase.from('follows')
      .select('following_id')
      .eq('follower_id', req.user.id)
    followedIds = (follows || []).map(f => f.following_id)
  }

  let posts = []

  // 2. First priority: posts from followed creators
  if (followedIds.length > 0) {
    const { data: followedPosts } = await supabase.from('posts')
      .select('*, profiles(username, full_name, avatar_url, account_type)')
      .in('creator_id', followedIds)
      .eq('is_demo', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    posts = followedPosts || []
  }

  // 3. If not enough posts, pad with public (non-premium) posts from all other creators
  if (posts.length < MIN_FOLLOWED_POSTS) {
    const existing = posts.map(p => p.id)
    const { data: morePosts } = await supabase.from('posts')
      .select('*, profiles(username, full_name, avatar_url, account_type)')
      .not('id', 'in', `(${existing.length > 0 ? existing.join(',') : 'null'})`)
      .eq('is_premium', false)
      .eq('is_demo', false)
      .order('created_at', { ascending: false })
      .limit(limit - posts.length)
    posts = [...posts, ...(morePosts || [])]
  }

  // 4. Filter out muted users
  let mutedIds = []
  if (req.user) {
    const { data: muted } = await supabase.from('muted_users')
      .select('muted_user_id').eq('user_id', req.user.id)
    mutedIds = (muted || []).map(m => m.muted_user_id)
    if (mutedIds.length > 0) {
      posts = posts.filter(p => !mutedIds.includes(p.creator_id))
    }
  }

  // 5. Generate signed URLs using per-post bucket
  const enriched = await Promise.all(posts.map(async (p) => {
    const bucket = p.storage_bucket || 'photos'
    const { data: urlData } = await supabase.storage.from(bucket).createSignedUrl(p.media_url, 3600)
    return { ...p, signed_url: urlData?.signedUrl || null }
  }))

  res.json({ posts: enriched, page })
}

// GET /api/posts/profile/:userId — All posts by a user
exports.getUserPosts = async (req, res) => {
  const supabase = getServiceClient()
  const { userId } = req.params
  const page = parseInt(req.query.page) || 1
  const limit = 24
  const offset = (page - 1) * limit

  const { data, error } = await supabase.from('posts')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })

  // Generate signed URLs using per-post bucket
  const enriched = await Promise.all(data.map(async (p) => {
    const bucket = p.storage_bucket || 'photos'
    const { data: urlData } = await supabase.storage.from(bucket).createSignedUrl(p.media_url, 3600)
    return { ...p, signed_url: urlData?.signedUrl || null }
  }))

  res.json({ posts: enriched, page })
}

// POST /api/posts/:id/like — Like or unlike a post
exports.likePost = async (req, res) => {
  const supabase = getServiceClient()
  const { id: postId } = req.params

  const { data: existing } = await supabase.from('likes')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('content_id', postId)
    .eq('content_type', 'post')
    .single()

  if (existing) {
    // Unlike
    await supabase.from('likes').delete().eq('id', existing.id)
    await supabase.from('posts').update({ likes_count: supabase.rpc('decrement', { x: 1 }) }).eq('id', postId)
    return res.json({ liked: false })
  } else {
    // Like
    await supabase.from('likes').insert({ user_id: req.user.id, content_id: postId, content_type: 'post' })
    // Get creator to notify
    const { data: post } = await supabase.from('posts').select('creator_id').eq('id', postId).single()
    if (post && post.creator_id !== req.user.id) {
      await supabase.from('notifications').insert({
        recipient_id: post.creator_id,
        actor_id: req.user.id,
        type: 'like',
        content_id: postId,
      })
    }
    return res.json({ liked: true })
  }
}
