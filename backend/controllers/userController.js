/**
 * userController.js — Neon PostgreSQL User Management
 * ──────────────────────────────────────────────────
 * Architectural Role:
 * Handles user profile retrieval, avatar updates, and full account deletion
 * directly on Neon PostgreSQL.
 */
const { query } = require('../config/db');

const SAFE_USER_FIELDS = `id, email, username, full_name, bio, website, avatar_url, account_type, credits, is_admin, is_verified, is_private, totp_enabled, notification_preferences, created_at, updated_at`;

// GET /api/users/me — Get own profile
exports.getMe = async (req, res) => {
  try {
    const userRes = await query(`SELECT ${SAFE_USER_FIELDS} FROM public.users WHERE id = $1`, [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Profile not found.' });
    res.json({ profile: userRes.rows[0] });
  } catch (err) {
    console.error('[user.getMe]', err.message);
    res.status(500).json({ error: 'Failed to retrieve profile: ' + err.message });
  }
};

// PUT /api/users/me/avatar — Update avatar URL
exports.updateAvatar = async (req, res) => {
  const { avatar_url } = req.body;
  if (!avatar_url) return res.status(400).json({ error: 'avatar_url required.' });

  try {
    const updateRes = await query(
      `UPDATE public.users SET avatar_url = $1, updated_at = now() WHERE id = $2 RETURNING ${SAFE_USER_FIELDS}`,
      [avatar_url, req.user.id]
    );

    if (updateRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    res.json({ profile: updateRes.rows[0] });
  } catch (err) {
    console.error('[user.updateAvatar]', err.message);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/users/me — Full account deletion pipeline
exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;

  try {
    // Delete cascading user record from Neon
    await query('DELETE FROM public.users WHERE id = $1', [userId]);

    res.json({ success: true, message: 'Account permanently deleted from Neon.' });
  } catch (err) {
    console.error('[user.deleteAccount]', err.message);
    res.status(500).json({ error: 'Account deletion failed: ' + err.message });
  }
};
