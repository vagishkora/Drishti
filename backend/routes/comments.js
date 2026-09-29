const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const cc = require('../controllers/commentController')

router.get('/:postId', cc.getComments)
router.post('/', authenticate, cc.addComment)
router.post('/:id/like', authenticate, cc.likeComment)

module.exports = router
