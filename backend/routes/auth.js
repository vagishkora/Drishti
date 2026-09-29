/**
 * Authentication Routes
 * ─────────────────────
 * Architectural Role: Maps HTTP endpoints to auth controller actions.
 * All routes are protected by express-validator input sanitisation
 * and IP-based rate limiting via authLimiter middleware.
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  signup, login, refreshToken,
  setup2FA, verify2FA, logout,
} = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');

// Apply rate limiter to all auth routes
router.use(authLimiter);

router.post('/signup', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], signup);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], login);

router.post('/refresh', refreshToken);

const { authenticate, optionalAuth } = require('../middleware/auth');

router.post('/setup-2fa', authenticate, setup2FA);

router.post('/verify-2fa', [
  optionalAuth,
  body('code').notEmpty().withMessage('2FA code or recovery token required'),
], verify2FA);

router.post('/logout', logout);

module.exports = router;
