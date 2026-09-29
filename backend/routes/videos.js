/**
 * Video Routes
 * ────────────
 * Architectural Role: Maps HTTP endpoints to video controller actions.
 * Upload route uses multer for multipart form parsing.
 * All routes except feed/single require JWT authentication.
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  uploadVideo, getFeed, getVideo, getPlayUrl, getMyVideos,
} = require('../controllers/videoController');

// Multer: in-memory storage (buffer sent to Supabase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});

// Public routes
router.get('/feed', getFeed);
router.get('/:id', getVideo);

// Protected routes
router.post('/upload', authenticate, upload.single('video'), uploadVideo);
router.get('/play/:id', authenticate, getPlayUrl);
router.get('/creator/my-videos', authenticate, getMyVideos);

module.exports = router;
