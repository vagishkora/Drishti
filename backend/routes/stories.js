const express = require('express')
const router = express.Router()
const multer = require('multer')
const { authenticate } = require('../middleware/auth')
const sc = require('../controllers/storiesController')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

// Feed stories
router.get('/feed', authenticate, sc.getStoriesFeed)

// Create story
router.post('/', authenticate, upload.single('media'), sc.createStory)

// View story
router.post('/:id/view', authenticate, sc.viewStory)

// Delete story
router.delete('/:id', authenticate, sc.deleteStory)

// Highlights
router.post('/highlights', authenticate, sc.createHighlight)
router.get('/highlights/:userId', sc.getUserHighlights)

module.exports = router
