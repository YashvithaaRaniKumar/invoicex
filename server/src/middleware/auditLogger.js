import { query } from '../config/db.js';

/**
 * Audit Logger Helper
 * Automatically logs business events into PostgreSQL audit_logs table
 */
export const logAuditEvent = async ({ userId, entityName, entityId, action, metadata = {} }) => {
  try {
    const id = `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const metadataStr = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;
    
    await query(
      `INSERT INTO audit_logs (id, user_id, entity_name, entity_id, action, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId || null, entityName, entityId, action, metadataStr]
    );
  } catch (err) {
    console.error('Audit logging failed (non-blocking):', err.message);
  }
};

/**
 * Notification Helper
 * Inserts in-app notifications into PostgreSQL notifications table
 */
export const createNotification = async ({ userId, title, message, type = 'INFO', linkUrl = null }) => {
  try {
    const id = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type, link_url, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)`,
      [id, userId, title, message, type, linkUrl]
    );
  } catch (err) {
    console.error('Notification creation failed (non-blocking):', err.message);
  }
};

export default {
  logAuditEvent,
  createNotification,
};
