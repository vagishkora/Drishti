const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const cc = require('../controllers/creditsController')

// All credit routes require authentication
router.get('/balance', authenticate, cc.getBalance)
router.post('/add', authenticate, cc.addCredits)
router.post('/spend', authenticate, cc.spendCredits)

module.exports = router
