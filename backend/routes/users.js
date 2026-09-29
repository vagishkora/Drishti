const express = require('express')
const router = express.Router()
const multer = require('multer')
const { authenticate } = require('../middleware/auth')
const uc = require('../controllers/userController')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.get('/me', authenticate, uc.getMe)
router.delete('/me', authenticate, uc.deleteAccount)
router.put('/me/avatar', authenticate, uc.updateAvatar)

module.exports = router
