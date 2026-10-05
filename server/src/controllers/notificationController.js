import { query } from '../config/db.js';

/**
 * GET /api/notifications
 * Retrieves notifications for the logged in user with unread counter
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || 'usr-002-finance';

    const listSql = `
      SELECT * FROM notifications
      WHERE user_id = $1 OR user_id IS NULL
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const listRes = await query(listSql, [userId]);

    const countSql = `
      SELECT COUNT(*) AS unread_count
      FROM notifications
      WHERE (user_id = $1 OR user_id IS NULL) AND is_read = FALSE
    `;
    const countRes = await query(countSql, [userId]);

    return res.status(200).json({
      success: true,
      notifications: listRes.rows,
      unreadCount: parseInt(countRes.rows[0].unread_count, 10),
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications for current user as read
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id || 'usr-002-finance';
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR user_id IS NULL', [userId]);
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark notifications read.' });
  }
};

export default {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
