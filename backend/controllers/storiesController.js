/**
 * storiesController.js
 * Architectural Role: Drishti Stories Engine
 * Manages 24-hour ephemeral story lifecycle: upload, feed, views.
 * Stories auto-expire via DB constraint (expires_at).
 */
const { v4: uuidv4 } = require('uuid')
const { getServiceClient } = require('../config/supabase')

const STORIES_BUCKET = 'stories'

// POST /api/stories — Upload a new story (photo or video ≤30s)
exports.createStory = async (req, res) => {
  const supabase = getServiceClient()

  if (!req.file) return res.status(400).json({ error: 'No media file provided.' })

  const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image'
  const ext = req.file.originalname.split('.').pop()
  const filePath = `${req.user.id}/${uuidv4()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(STORIES_BUCKET)
    .upload(filePath, req.file.buffer, { contentType: req.file.mimetype })

  if (uploadError) return res.status(500).json({ error: uploadError.message })

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: story, error: dbError } = await supabase.from('stories')
    .insert({
      user_id: req.user.id,
      media_url: filePath,
      media_type: mediaType,
      storage_bucket: STORIES_BUCKET,
      expires_at: expiresAt,
    })
    .select('*, profiles(username, full_name, avatar_url)')
    .single()

  if (dbError) return res.status(500).json({ error: dbError.message })

  // Generate signed URL for immediate preview
  const { data: urlData } = await supabase.storage.from(STORIES_BUCKET).createSignedUrl(filePath, 3600)

  res.status(201).json({ story: { ...story, signed_url: urlData?.signedUrl || null } })
}

// GET /api/stories/feed — Get active stories from followed users + self
exports.getStoriesFeed = async (req, res) => {
  const supabase = getServiceClient()
  const now = new Date().toISOString()

  // Get followed users IDs
  let followedIds = req.user ? [req.user.id] : []
  if (req.user) {
    const { data: follows } = await supabase.from('follows')
      .select('following_id').eq('follower_id', req.user.id)
    followedIds = [...followedIds, ...(follows || []).map(f => f.following_id)]
  }

  // Get active stories from followed users
  const { data: stories, error } = await supabase.from('stories')
    .select('*, profiles(id, username, full_name, avatar_url)')
    .in('user_id', followedIds)
    .gt('expires_at', now)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  // Group by user and generate signed URLs
  const userMap = {}
  await Promise.all((stories || []).map(async (s) => {
    const { data: urlData } = await supabase.storage.from(STORIES_BUCKET).createSignedUrl(s.media_url, 3600)
    const storyWithUrl = { ...s, signed_url: urlData?.signedUrl || null }
    const uid = s.user_id
    if (!userMap[uid]) {
      userMap[uid] = { user: s.profiles, stories: [] }
    }
    userMap[uid].stories.push(storyWithUrl)
  }))

  // Sort so own stories come first
  const feed = Object.values(userMap).sort((a, b) => {
    if (req.user && a.user?.id === req.user.id) return -1
    if (req.user && b.user?.id === req.user.id) return 1
    return 0
  })

  res.json({ feed, total_users: feed.length })
}

// POST /api/stories/:id/view — Record a story view
exports.viewStory = async (req, res) => {
  const supabase = getServiceClient()
  const { id: storyId } = req.params

  // Deduplicated insert
  const { error } = await supabase.from('story_views').upsert({
    story_id: storyId,
    viewer_id: req.user.id,
  }, { onConflict: 'story_id,viewer_id' })

  if (error) return res.status(500).json({ error: error.message })

  // Increment view count
  await supabase.rpc('increment_story_views', { story_id_input: storyId }).catch(() => {
    // Fallback if RPC doesn't exist
    supabase.from('stories').select('views').eq('id', storyId).single()
      .then(({ data }) => {
        if (data) supabase.from('stories').update({ views: (data.views || 0) + 1 }).eq('id', storyId)
      })
  })

  res.json({ success: true })
}

// DELETE /api/stories/:id — Delete own story
exports.deleteStory = async (req, res) => {
  const supabase = getServiceClient()
  const { id: storyId } = req.params

  const { data: story } = await supabase.from('stories')
    .select('media_url, user_id').eq('id', storyId).single()

  if (!story) return res.status(404).json({ error: 'Story not found.' })
  if (story.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized.' })

  await supabase.storage.from(STORIES_BUCKET).remove([story.media_url])
  await supabase.from('stories').delete().eq('id', storyId)

  res.json({ success: true })
}

// POST /api/stories/highlights — Create a highlight
exports.createHighlight = async (req, res) => {
  const supabase = getServiceClient()
  const { title, cover_url, story_ids } = req.body

  if (!title) return res.status(400).json({ error: 'Title is required.' })

  const { data: highlight, error } = await supabase.from('highlights')
    .insert({ user_id: req.user.id, title, cover_url })
    .select().single()

  if (error) return res.status(500).json({ error: error.message })

  if (story_ids && story_ids.length > 0) {
    await supabase.from('highlight_stories').insert(
      story_ids.map((sid) => ({ highlight_id: highlight.id, story_id: sid }))
    )
  }

  res.status(201).json({ highlight })
}

// GET /api/stories/highlights/:userId — Get user's highlights
exports.getUserHighlights = async (req, res) => {
  const supabase = getServiceClient()
  const { userId } = req.params

  const { data, error } = await supabase.from('highlights')
    .select('*, highlight_stories(story_id, stories(media_url, media_type, storage_bucket))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ highlights: data || [] })
}
