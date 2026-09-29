/**
 * auth.js — Enterprise JWT & RBAC Authentication Middleware
 * ──────────────────────────────────────────────────────────
 * Architectural Role:
 * Validates cryptographically signed JWT access tokens against the JWT_SECRET.
 * Queries Neon PostgreSQL to attach full security profile to `req.user`.
 * Enforces Role-Based Access Control (RBAC) via `requireAdmin`.
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_jwt_key_2026!';

/**
 * authenticate — Mandatory JWT Verification
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user exists and fetch live security flags from Neon
    const userRes = await query(
      'SELECT id, email, username, is_admin, is_verified, account_type FROM public.users WHERE id = $1',
      [decoded.id || decoded.sub]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User session revoked or account deleted.' });
    }

    req.user = userRes.rows[0];
    req.token = token;
    next();
  } catch (err) {
    console.error('[authenticate error]:', err.message);
    return res.status(401).json({ error: 'Invalid, expired, or tampered access token: ' + err.message });
  }
};

/**
 * optionalAuth — Non-blocking identity check
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRes = await query(
      'SELECT id, email, username, is_admin, is_verified, account_type FROM public.users WHERE id = $1',
      [decoded.id || decoded.sub]
    );
    if (userRes.rows.length > 0) {
      req.user = userRes.rows[0];
      req.token = token;
    }
  } catch (_) {
    // Non-fatal for optional routes
  }
  next();
};

/**
 * requireAdmin — Zero-Trust RBAC Middleware
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Access Denied: Administrative authorization required.' });
  }
  next();
};

module.exports = { authenticate, optionalAuth, requireAdmin };
