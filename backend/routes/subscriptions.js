/**
 * Subscription Routes
 * ───────────────────
 * Architectural Role: Maps payment and subscription endpoints.
 * All routes require JWT authentication.
 * Payment route validates input via express-validator.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  processPayment, checkSubscription, getMySubscribers,
} = require('../controllers/subscriptionController');

router.post('/pay', authenticate, [
  body('creator_id').notEmpty().withMessage('Creator ID is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('card_number').notEmpty(),
  body('cvv').matches(/^\d{3,4}$/),
  body('expiry').matches(/^(0[1-9]|1[0-2])\/\d{2}$/),
], processPayment);

router.get('/status/:creatorId', authenticate, checkSubscription);
router.get('/my-subscribers', authenticate, getMySubscribers);

module.exports = router;
