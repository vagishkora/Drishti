const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const fc = require('../controllers/followController')

router.post('/:userId', authenticate, fc.followUser)
router.delete('/:userId', authenticate, fc.unfollowUser)
router.get('/check/:userId', authenticate, fc.checkFollow)
router.get('/:userId/followers', fc.getFollowers)
router.get('/:userId/following', fc.getFollowing)

module.exports = router
