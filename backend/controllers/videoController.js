/**
 * Video Controller
 * ────────────────
 * Architectural Role: Handles video upload to Supabase Storage,
 * metadata persistence to PostgreSQL, paginated feed retrieval,
 * and signed URL generation for premium content (1-hour expiry).
 */

const { supabase } = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

/**
 * POST /api/videos/upload
 * Accepts multipart form data. Stores file in Supabase Storage
 * and records metadata in the `videos` table.
 */
const uploadVideo = async (req, res) => {
  const { title, description, is_premium } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Video file is required' });
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const ext = path.extname(file.originalname) || '.webm';
  const filePath = `${req.user.id}/${uuidv4()}${ext}`;

  try {
    // 1. Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    // 2. Persist metadata
    const { data, error: dbError } = await supabase
      .from('videos')
      .insert({
        creator_id: req.user.id,
        title,
        description: description || null,
        video_url: filePath,
        is_premium: is_premium === 'true' || is_premium === true,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage on DB failure
      await supabase.storage.from('videos').remove([filePath]);
      throw new Error(dbError.message);
    }

    return res.status(201).json(data);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};

/**
 * GET /api/videos/feed
 * Returns a paginated list of videos. Non-premium videos are public.
 * Accepts ?page=1&limit=12 query params.
 */
const getFeed = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const { data, error, count } = await supabase
      .from('videos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    return res.json({
      videos: data,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/videos/:id
 * Returns single video metadata.
 */
const getVideo = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Video not found' });
    }

    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/videos/play/:id
 * Generates a 1-hour signed URL for video playback.
 * Premium videos require an active subscription to the creator.
 */
const getPlayUrl = async (req, res) => {
  try {
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Premium gate: check subscription if not the creator
    if (video.is_premium && video.creator_id !== req.user.id) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('subscriber_id', req.user.id)
        .eq('creator_id', video.creator_id)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .single();

      if (!sub) {
        return res.status(403).json({ error: 'Active subscription required for premium content' });
      }
    }

    // Generate signed URL — 1 hour expiry
    const { data: urlData, error: urlError } = await supabase.storage
      .from('videos')
      .createSignedUrl(video.video_url, 3600);

    if (urlError) throw new Error(urlError.message);

    // Increment view count
    await supabase
      .from('videos')
      .update({ views_count: (video.views_count || 0) + 1 })
      .eq('id', video.id);

    return res.json({
      play_url: urlData.signedUrl,
      expires_in_seconds: 3600,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/videos/creator/my-videos
 * Returns all videos uploaded by the authenticated creator.
 */
const getMyVideos = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('creator_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { uploadVideo, getFeed, getVideo, getPlayUrl, getMyVideos };
