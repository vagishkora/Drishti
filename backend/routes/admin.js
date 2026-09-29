const express = require('express')
const router = express.Router()
const { authenticate, requireAdmin } = require('../middleware/auth')
const ac = require('../controllers/adminController')

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin)

router.get('/stats', ac.getStats)
router.get('/users', ac.listUsers)
router.get('/users/:userId', ac.getUser)
router.put('/users/:userId/verify', ac.toggleVerify)
router.put('/users/:userId/admin', ac.toggleAdmin)
router.post('/users/:userId/credits', ac.grantCredits)
router.get('/reports', ac.listReports)
router.post('/reports/:reportId/resolve', ac.resolveReport)
router.get('/soc/logs', ac.getAuditLogs)
router.post('/soc/verify', ac.verifyAuditChain)

module.exports = router
