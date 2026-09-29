const express = require('express');
const router = express.Router();
const rc = require('../controllers/razorpayController');
const { authenticate } = require('../middleware/auth');

router.post('/order', authenticate, rc.createOrder);
router.post('/verify', authenticate, rc.verifyPayment);

module.exports = router;
