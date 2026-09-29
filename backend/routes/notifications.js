const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const nc = require('../controllers/notificationController')

router.get('/', authenticate, nc.getNotifications)
router.patch('/read', authenticate, nc.markAllRead)
router.get('/unread-count', authenticate, nc.getUnreadCount)

module.exports = router
