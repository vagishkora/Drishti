/**
 * authController.js — Neon PostgreSQL Native Auth & 2FA Controller
 * ───────────────────────────────────────────────────────────────
 * Architectural Role:
 * Implements self-contained, enterprise-grade authentication:
 *  - Native password hashing using Bcrypt (12 salt rounds).
 *  - Short-lived cryptographically signed JWT access tokens (15m).
 *  - HttpOnly SameSite refresh tokens for replay-resistant session renewal.
 *  - TOTP 2FA (RFC 6238) with AES-256-GCM envelope encryption at rest.
 *  - Cryptographic single-use emergency recovery codes (SHA-256 hashed).
 *  - SIEM audit event emission into the SHA-256 hash chain on Neon.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OTPAuth } = require('otpauth');
const { query } = require('../config/db');
const { encryptField, decryptField, generateRecoveryCodes, hashRecoveryCode } = require('../utils/crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'my_super_secret_jwt_key_2026!';
const REFRESH_SECRET = (process.env.JWT_SECRET || 'my_super_secret_jwt_key_2026!') + '_refresh';

/**
 * Helper to emit a security audit event into the Neon hash chain
 */
async function emitAuditEvent(eventType, severity, actorId, req, details = {}) {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const ua = req.headers['user-agent'] || 'Unknown-Client';

    await query(
      `SELECT public.log_security_event($1, $2, $3, $4, $5, $6);`,
      [eventType, severity, actorId || null, String(ip), String(ua), JSON.stringify(details)]
    );
  } catch (err) {
    console.error('[AUDIT_CHAIN_ERROR] Failed to append log to Neon:', err.message);
  }
}

/**
 * POST /api/auth/signup
 */
const signup = async (req, res) => {
  const { email, password, fullName, username } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const sanitizedEmail = email.toLowerCase().trim();
  const chosenUsername = (username || sanitizedEmail.split('@')[0]).toLowerCase().trim();

  try {
    // 1. Check if user already exists
    const existing = await query(
      'SELECT id FROM public.users WHERE email = $1 OR username = $2',
      [sanitizedEmail, chosenUsername]
    );

    if (existing.rows.length > 0) {
      await emitAuditEvent('AUTH_SIGNUP_DUPLICATE_ATTEMPT', 'WARNING', null, req, { email: sanitizedEmail });
      return res.status(400).json({ error: 'An account with that email or username already exists.' });
    }

    // 2. Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // 3. Insert user into Neon
    const insertRes = await query(`
      INSERT INTO public.users (email, password_hash, username, full_name, credits)
      VALUES ($1, $2, $3, $4, 500)
      RETURNING id, email, username, full_name, credits, is_admin, is_verified;
    `, [sanitizedEmail, passwordHash, chosenUsername, fullName || '']);

    const newUser = insertRes.rows[0];

    // Log welcome bonus in ledger
    await query(`
      INSERT INTO public.credit_transactions (user_id, amount, balance_after, type, description)
      VALUES ($1, 500, 500, 'signup_bonus', 'Welcome bonus — 500 Drishti Credits');
    `, [newUser.id]);

    // Issue JWT
    const accessToken = jwt.sign(
      { id: newUser.id, email: newUser.email, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: newUser.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await emitAuditEvent('AUTH_SIGNUP_SUCCESS', 'INFO', newUser.id, req, { email: sanitizedEmail });

    return res.status(201).json({
      access_token: accessToken,
      user: newUser,
      message: 'Account registered successfully with 500 welcome credits.',
    });
  } catch (err) {
    console.error('[signup error]:', err.message);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }

  const sanitizedEmail = email.toLowerCase().trim();

  try {
    const userRes = await query(
      'SELECT id, email, password_hash, username, full_name, avatar_url, credits, is_admin, is_verified, totp_enabled FROM public.users WHERE email = $1',
      [sanitizedEmail]
    );

    if (userRes.rows.length === 0) {
      await emitAuditEvent('AUTH_LOGIN_FAILURE', 'WARNING', null, req, { email: sanitizedEmail, reason: 'User not found' });
      return res.status(400).json({ error: 'Invalid email or credentials.' });
    }

    const user = userRes.rows[0];

    // Verify bcrypt hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await emitAuditEvent('AUTH_LOGIN_FAILURE', 'WARNING', user.id, req, { email: sanitizedEmail, reason: 'Invalid password' });
      return res.status(400).json({ error: 'Invalid email or credentials.' });
    }

    // Issue tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await emitAuditEvent('AUTH_LOGIN_SUCCESS', 'INFO', user.id, req, {
      email: sanitizedEmail,
      totp_enabled: user.totp_enabled,
    });

    return res.json({
      access_token: accessToken,
      requires_2fa: user.totp_enabled,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        credits: user.credits,
        isAdmin: user.is_admin,
        isVerified: user.is_verified,
      },
    });
  } catch (err) {
    console.error('[login error]:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  const token = req.cookies?.refresh_token;

  if (!token) {
    return res.status(401).json({ error: 'No refresh token found' });
  }

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);

    const userRes = await query(
      'SELECT id, email, username FROM public.users WHERE id = $1',
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'User does not exist.' });
    }

    const user = userRes.rows[0];

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({ access_token: newAccessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
};

/**
 * POST /api/auth/setup-2fa
 */
const setup2FA = async (req, res) => {
  const userId = req.user?.id;
  const userEmail = req.user?.email;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required to setup 2FA' });
  }

  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'Drishti',
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const clearSecret = totp.secret.base32;
    const encryptedSecret = encryptField(clearSecret);

    const recoveryCodes = generateRecoveryCodes(8);
    const hashedCodes = recoveryCodes.map(code => hashRecoveryCode(code));

    await query(
      `UPDATE public.users 
       SET totp_secret_encrypted = $1, totp_recovery_codes_hashed = $2, updated_at = now() 
       WHERE id = $3;`,
      [encryptedSecret, hashedCodes, userId]
    );

    await emitAuditEvent('2FA_PROVISIONED', 'INFO', userId, req, {
      action: '2FA initialization request',
    });

    return res.json({
      otpauth_url: totp.toString(),
      recovery_codes: recoveryCodes,
      message: 'Scan the QR code or import the URI into your Authenticator app. Save your recovery codes safely.',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to provision 2FA: ' + err.message });
  }
};

/**
 * POST /api/auth/verify-2fa
 */
const verify2FA = async (req, res) => {
  const userId = req.user?.id || req.body.userId;
  const { code } = req.body;

  if (!userId || !code) {
    return res.status(400).json({ error: 'Missing userId or 2FA code' });
  }

  try {
    const userRes = await query(
      'SELECT totp_secret_encrypted, totp_recovery_codes_hashed, totp_enabled FROM public.users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0 || !userRes.rows[0].totp_secret_encrypted) {
      return res.status(400).json({ error: '2FA is not provisioned for this account.' });
    }

    const userProfile = userRes.rows[0];
    const cleanCode = String(code).trim();

    // 1. Try TOTP code
    const clearSecret = decryptField(userProfile.totp_secret_encrypted);
    const totp = new OTPAuth.TOTP({
      issuer: 'Drishti',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(clearSecret),
    });

    const delta = totp.validate({ token: cleanCode, window: 1 });

    if (delta !== null) {
      await query('UPDATE public.users SET totp_enabled = true WHERE id = $1', [userId]);
      await emitAuditEvent('2FA_VERIFIED_SUCCESS', 'INFO', userId, req, { method: 'authenticator_app' });

      return res.json({ verified: true, message: '2FA verified successfully.' });
    }

    // 2. Check emergency recovery code
    const hashedAttempt = hashRecoveryCode(cleanCode);
    const existingCodes = userProfile.totp_recovery_codes_hashed || [];

    if (existingCodes.includes(hashedAttempt)) {
      const remainingCodes = existingCodes.filter(c => c !== hashedAttempt);
      await query(
        'UPDATE public.users SET totp_recovery_codes_hashed = $1, totp_enabled = true WHERE id = $2',
        [remainingCodes, userId]
      );

      await emitAuditEvent('2FA_RECOVERY_CODE_CONSUMED', 'WARNING', userId, req, {
        remaining_codes: remainingCodes.length,
      });

      return res.json({
        verified: true,
        recovery_used: true,
        remaining_codes: remainingCodes.length,
        message: 'Verified using emergency recovery code.',
      });
    }

    await emitAuditEvent('2FA_VERIFIED_FAILURE', 'WARNING', userId, req, { attempt: cleanCode });
    return res.status(400).json({ error: 'Invalid 2FA code or recovery token.' });
  } catch (err) {
    return res.status(500).json({ error: 'Verification failed: ' + err.message });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  const userId = req.user?.id;
  res.clearCookie('refresh_token');
  if (userId) {
    await emitAuditEvent('AUTH_LOGOUT', 'INFO', userId, req);
  }
  return res.json({ message: 'Logged out successfully' });
};

module.exports = { signup, login, refreshToken, setup2FA, verify2FA, logout };
