const express = require('express')
const router = express.Router()
const multer = require('multer')
const { authenticate, optionalAuth } = require('../middleware/auth')
const pc = require('../controllers/postController')

// multer: 100 MB limit, in-memory for Supabase stream
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } })

router.get('/feed', optionalAuth, pc.getFeed)
router.post('/upload', authenticate, upload.single('media'), pc.uploadPost)
router.get('/profile/:userId', pc.getUserPosts)
router.post('/:id/like', authenticate, pc.likePost)

module.exports = router
