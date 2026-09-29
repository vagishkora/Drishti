const express = require('express')
const router = express.Router()
const { authenticate, optionalAuth } = require('../middleware/auth')
const sc = require('../controllers/searchController')

router.get('/', sc.searchUsers)
router.get('/explore', sc.getExplore)
router.get('/suggested', authenticate, sc.getSuggested)
router.get('/profile/:userId', optionalAuth, sc.getProfile)

module.exports = router
