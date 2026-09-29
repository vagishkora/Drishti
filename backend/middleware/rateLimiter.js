/**
 * Rate Limiter Middleware
 * ───────────────────────
 * Architectural Role: IP-based rate limiting on authentication endpoints
 * to prevent brute-force attacks. Uses a sliding window approach.
 * In production, back this with Redis for distributed rate limiting.
 */

const rateLimit = require('express-rate-limit');

/** Auth endpoints: 20 requests per minute per IP */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again after 60 seconds.',
  },
});

/** General API: 100 requests per minute per IP */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, generalLimiter };
