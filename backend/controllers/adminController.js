/**
 * adminController.js — Neon PostgreSQL Admin & SOC Controller
 * ───────────────────────────────────────────────────────────
 * Architectural Role:
 * Directly executes optimized relational queries against Neon PostgreSQL.
 * Provides platform statistics, user management, credit grants, report resolution,
 * and cryptographic audit chain verification.
 */

const { query } = require('../config/db');

// GET /api/admin/stats — Platform-wide statistics
exports.getStats = async (req, res) => {
  try {
    const statsRes = await query(`
      SELECT 
        (SELECT COUNT(*) FROM public.users)::int as total_users,
        (SELECT COUNT(*) FROM public.users WHERE account_type = 'creator')::int as total_creators,
        (SELECT COUNT(*) FROM public.posts)::int as total_posts,
        (SELECT COUNT(*) FROM public.subscriptions WHERE is_active = true)::int as active_subscriptions,
        (SELECT COUNT(*) FROM public.reports)::int as pending_reports,
        (SELECT COALESCE(SUM(credits), 0) FROM public.users)::int as total_credits;
    `);

    const row = statsRes.rows[0];

    res.json({
      totalUsers: row.total_users || 0,
      totalCreators: row.total_creators || 0,
      totalPosts: row.total_posts || 0,
      activeSubscriptions: row.active_subscriptions || 0,
      pendingReports: row.pending_reports || 0,
      totalCredits: row.total_credits || 0,
    });
  } catch (err) {
    console.error('[admin.getStats]', err.message);
    res.status(500).json({ error: 'Failed to fetch stats: ' + err.message });
  }
};

// GET /api/admin/users — Paginated user list with filters
exports.listUsers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const { search, type } = req.query;
  const offset = (page - 1) * limit;

  try {
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (type && type !== 'all') {
      whereClauses.push(`account_type = $${paramIndex++}`);
      params.push(type);
    }

    if (search) {
      whereClauses.push(`(username ILIKE $${paramIndex} OR full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*)::int as count FROM public.users ${whereSQL}`, params);
    const total = countRes.rows[0].count;

    const dataSQL = `
      SELECT id, email, username, full_name, avatar_url, account_type, credits, is_admin, is_verified, is_private, created_at
      FROM public.users
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataRes = await query(dataSQL, [...params, limit, offset]);

    res.json({
      users: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('[admin.listUsers]', err.message);
    res.status(500).json({ error: 'Failed to list users: ' + err.message });
  }
};

// GET /api/admin/users/:userId — Full user profile
exports.getUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const userRes = await query(`
      SELECT u.*, 
        (SELECT COUNT(*)::int FROM public.posts WHERE user_id = u.id) as posts_count,
        (SELECT COUNT(*)::int FROM public.follows WHERE following_id = u.id) as followers_count,
        (SELECT COUNT(*)::int FROM public.follows WHERE follower_id = u.id) as following_count
      FROM public.users u
      WHERE u.id = $1
    `, [userId]);

    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    const user = userRes.rows[0];
    res.json({
      user,
      postsCount: user.posts_count,
      followersCount: user.followers_count,
      followingCount: user.following_count,
    });
  } catch (err) {
    console.error('[admin.getUser]', err.message);
    res.status(500).json({ error: 'Failed to fetch user: ' + err.message });
  }
};

// PUT /api/admin/users/:userId/verify
exports.toggleVerify = async (req, res) => {
  const { userId } = req.params;

  try {
    const updateRes = await query(`
      UPDATE public.users 
      SET is_verified = NOT is_verified, updated_at = now() 
      WHERE id = $1 
      RETURNING *;
    `, [userId]);

    if (updateRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    res.json({ user: updateRes.rows[0] });
  } catch (err) {
    console.error('[admin.toggleVerify]', err.message);
    res.status(500).json({ error: 'Failed to toggle verify: ' + err.message });
  }
};

// PUT /api/admin/users/:userId/admin
exports.toggleAdmin = async (req, res) => {
  const { userId } = req.params;

  try {
    const updateRes = await query(`
      UPDATE public.users 
      SET is_admin = NOT is_admin, updated_at = now() 
      WHERE id = $1 
      RETURNING *;
    `, [userId]);

    if (updateRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });

    res.json({ user: updateRes.rows[0] });
  } catch (err) {
    console.error('[admin.toggleAdmin]', err.message);
    res.status(500).json({ error: 'Failed to toggle admin: ' + err.message });
  }
};

// POST /api/admin/users/:userId/credits
exports.grantCredits = async (req, res) => {
  const { userId } = req.params;
  const { amount, description } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'A positive amount is required.' });
  }

  try {
    const rpcRes = await query(
      `SELECT public.add_credits_secure($1, $2, 'admin_grant', $3) as new_balance;`,
      [userId, amount, description || `Admin grant by ${req.user?.id || 'Root Admin'}`]
    );

    res.json({ success: true, balance: rpcRes.rows[0].new_balance });
  } catch (err) {
    console.error('[admin.grantCredits]', err.message);
    res.status(500).json({ error: 'Failed to grant credits: ' + err.message });
  }
};

// GET /api/admin/reports — List all reports
exports.listReports = async (req, res) => {
  try {
    const reportsRes = await query(`
      SELECT 
        r.*,
        json_build_object('id', rep.id, 'username', rep.username, 'avatar_url', rep.avatar_url) as reporter,
        json_build_object('id', tgt.id, 'username', tgt.username, 'avatar_url', tgt.avatar_url) as reported_user,
        json_build_object('id', p.id, 'caption', p.caption, 'media_url', p.media_url, 'media_type', p.media_type) as reported_post
      FROM public.reports r
      LEFT JOIN public.users rep ON r.reporter_id = rep.id
      LEFT JOIN public.users tgt ON r.reported_user_id = tgt.id
      LEFT JOIN public.posts p ON r.reported_post_id = p.id
      ORDER BY r.created_at DESC;
    `);

    res.json({ reports: reportsRes.rows });
  } catch (err) {
    console.error('[admin.listReports]', err.message);
    res.status(500).json({ error: 'Failed to list reports: ' + err.message });
  }
};

// POST /api/admin/reports/:reportId/resolve
exports.resolveReport = async (req, res) => {
  const { reportId } = req.params;
  const { action } = req.body;

  try {
    const reportRes = await query('SELECT * FROM public.reports WHERE id = $1', [reportId]);
    if (reportRes.rows.length === 0) return res.status(404).json({ error: 'Report not found.' });

    const report = reportRes.rows[0];

    if (action === 'delete_post' && report.reported_post_id) {
      await query('DELETE FROM public.posts WHERE id = $1', [report.reported_post_id]);
    } else if (action === 'delete_user' && report.reported_user_id) {
      await query('DELETE FROM public.users WHERE id = $1', [report.reported_user_id]);
    }

    await query('DELETE FROM public.reports WHERE id = $1', [reportId]);

    res.json({ success: true, message: `Report resolved via ${action}.` });
  } catch (err) {
    console.error('[admin.resolveReport]', err.message);
    res.status(500).json({ error: 'Failed to resolve report: ' + err.message });
  }
};

// GET /api/admin/soc/logs — Live SIEM event stream
exports.getAuditLogs = async (req, res) => {
  try {
    const logsRes = await query(`
      SELECT l.*, json_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url) as actor
      FROM public.security_audit_logs l
      LEFT JOIN public.users u ON l.actor_id = u.id
      ORDER BY l.id DESC
      LIMIT 50;
    `);

    res.json({ logs: logsRes.rows });
  } catch (err) {
    console.error('[admin.getAuditLogs]', err.message);
    res.status(500).json({ error: 'Failed to fetch audit logs: ' + err.message });
  }
};

// POST /api/admin/soc/verify — Verify Cryptographic Audit Chain
exports.verifyAuditChain = async (req, res) => {
  try {
    const verifyRes = await query('SELECT public.verify_audit_log_integrity() as result;');
    res.json(verifyRes.rows[0].result);
  } catch (err) {
    console.error('[admin.verifyAuditChain]', err.message);
    res.status(500).json({ error: 'Failed to verify audit chain: ' + err.message });
  }
};
