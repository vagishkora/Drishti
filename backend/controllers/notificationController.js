/**
 * notificationController.js
 * Architectural Role: In-app Notification System.
 * Retrieves notifications for the current user, supports unread count badge.
 */
const { getServiceClient } = require('../config/supabase')

// GET /api/notifications — Get all notifications for current user
exports.getNotifications = async (req, res) => {
  const supabase = getServiceClient()
  const page = parseInt(req.query.page) || 1
  const limit = 30
  const offset = (page - 1) * limit

  const { data, error } = await supabase.from('notifications')
    .select('*, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)')
    .eq('recipient_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })

  const unread = data.filter(n => !n.read).length

  res.json({ notifications: data, unread_count: unread, page })
}

// PATCH /api/notifications/read — Mark all notifications as read
exports.markAllRead = async (req, res) => {
  const supabase = getServiceClient()

  const { error } = await supabase.from('notifications')
    .update({ read: true })
    .eq('recipient_id', req.user.id)
    .eq('read', false)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

// GET /api/notifications/unread-count — Quick count for badge
exports.getUnreadCount = async (req, res) => {
  const supabase = getServiceClient()

  const { count, error } = await supabase.from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', req.user.id)
    .eq('read', false)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ unread_count: count || 0 })
}
