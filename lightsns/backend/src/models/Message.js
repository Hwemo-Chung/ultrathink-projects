const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Message Model
 * Handles all database operations for direct messages
 */
class Message {
  /**
   * Send a message
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Created message
   */
  static async create(messageData) {
    const {
      sender_id,
      recipient_id,
      content,
      image_url = null
    } = messageData;

    try {
      // Prevent sending to self
      if (sender_id === recipient_id) {
        throw new Error('Cannot send message to yourself');
      }

      const result = await db.query(
        `INSERT INTO messages (sender_id, recipient_id, content, image_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, sender_id, recipient_id, content, image_url,
                   is_read, created_at`,
        [sender_id, recipient_id, content, image_url]
      );

      logger.info('Message sent', {
        messageId: result.rows[0].id,
        senderId: sender_id,
        recipientId: recipient_id
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error sending message', { error: error.message });
      throw error;
    }
  }

  /**
   * Get conversation between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @param {number} limit - Maximum results
   * @param {string} cursor - Pagination cursor (message ID)
   * @returns {Promise<Array>} Array of messages
   */
  static async getConversation(userId1, userId2, limit = 50, cursor = null) {
    try {
      let query = `
        SELECT
          m.*,
          s.username as sender_username,
          s.display_name as sender_display_name,
          s.avatar_thumbnail_url as sender_avatar,
          r.username as recipient_username,
          r.display_name as recipient_display_name,
          r.avatar_thumbnail_url as recipient_avatar
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        JOIN users r ON m.recipient_id = r.id
        WHERE m.is_deleted = FALSE
          AND (
            (m.sender_id = $1 AND m.recipient_id = $2)
            OR (m.sender_id = $2 AND m.recipient_id = $1)
          )
      `;

      const params = [userId1, userId2];

      if (cursor) {
        query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $3)`;
        params.push(cursor);
      }

      query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await db.query(query, params);

      // Return in chronological order (oldest first)
      return result.rows.reverse();
    } catch (error) {
      logger.error('Error getting conversation', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all conversations for a user with last message preview
   * @param {string} userId - User ID
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of conversations
   */
  static async getConversations(userId, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `WITH latest_messages AS (
          SELECT DISTINCT ON (
            CASE
              WHEN sender_id = $1 THEN recipient_id
              ELSE sender_id
            END
          )
            m.id,
            m.sender_id,
            m.recipient_id,
            m.content,
            m.image_url,
            m.is_read,
            m.created_at,
            CASE
              WHEN sender_id = $1 THEN recipient_id
              ELSE sender_id
            END as other_user_id
          FROM messages m
          WHERE (m.sender_id = $1 OR m.recipient_id = $1)
            AND m.is_deleted = FALSE
          ORDER BY
            CASE
              WHEN sender_id = $1 THEN recipient_id
              ELSE sender_id
            END,
            m.created_at DESC
        )
        SELECT
          lm.*,
          u.username as other_user_username,
          u.display_name as other_user_display_name,
          u.avatar_thumbnail_url as other_user_avatar,
          u.is_verified as other_user_verified,
          (
            SELECT COUNT(*)
            FROM messages m2
            WHERE m2.recipient_id = $1
              AND m2.sender_id = lm.other_user_id
              AND m2.is_read = FALSE
              AND m2.is_deleted = FALSE
          ) as unread_count
        FROM latest_messages lm
        JOIN users u ON lm.other_user_id = u.id
        WHERE u.is_active = TRUE
        ORDER BY lm.created_at DESC
        LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting conversations', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark message(s) as read
   * @param {string} userId - User ID (recipient)
   * @param {string} senderId - Sender ID
   * @returns {Promise<number>} Number of messages marked as read
   */
  static async markAsRead(userId, senderId) {
    try {
      const result = await db.query(
        `UPDATE messages
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE recipient_id = $1
           AND sender_id = $2
           AND is_read = FALSE
           AND is_deleted = FALSE`,
        [userId, senderId]
      );

      logger.info('Messages marked as read', {
        userId,
        senderId,
        count: result.rowCount
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Error marking messages as read', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark a single message as read
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID (must be recipient)
   * @returns {Promise<Object|null>} Updated message or null
   */
  static async markMessageAsRead(messageId, userId) {
    try {
      const result = await db.query(
        `UPDATE messages
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND recipient_id = $2
           AND is_read = FALSE
           AND is_deleted = FALSE
         RETURNING *`,
        [messageId, userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error marking message as read', { error: error.message });
      throw error;
    }
  }

  /**
   * Get unread message count
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(userId) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count
         FROM messages
         WHERE recipient_id = $1
           AND is_read = FALSE
           AND is_deleted = FALSE`,
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting unread count', { error: error.message });
      throw error;
    }
  }

  /**
   * Get unread count by conversation
   * @param {string} userId - User ID (recipient)
   * @param {string} senderId - Sender ID
   * @returns {Promise<number>} Unread count for this conversation
   */
  static async getConversationUnreadCount(userId, senderId) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count
         FROM messages
         WHERE recipient_id = $1
           AND sender_id = $2
           AND is_read = FALSE
           AND is_deleted = FALSE`,
        [userId, senderId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting conversation unread count', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete a message (soft delete)
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID (must be sender)
   * @returns {Promise<boolean>} Success
   */
  static async delete(messageId, userId) {
    try {
      const result = await db.query(
        `UPDATE messages
         SET is_deleted = TRUE
         WHERE id = $1 AND sender_id = $2
         RETURNING id`,
        [messageId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Message not found or unauthorized');
      }

      logger.info('Message deleted', { messageId, userId });
      return true;
    } catch (error) {
      logger.error('Error deleting message', { error: error.message });
      throw error;
    }
  }

  /**
   * Find message by ID
   * @param {string} id - Message ID
   * @returns {Promise<Object|null>} Message or null
   */
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT
           m.*,
           s.username as sender_username,
           s.display_name as sender_display_name,
           s.avatar_thumbnail_url as sender_avatar,
           r.username as recipient_username,
           r.display_name as recipient_display_name,
           r.avatar_thumbnail_url as recipient_avatar
         FROM messages m
         JOIN users s ON m.sender_id = s.id
         JOIN users r ON m.recipient_id = r.id
         WHERE m.id = $1 AND m.is_deleted = FALSE`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding message', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Search messages in a conversation
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Array of messages
   */
  static async searchInConversation(userId1, userId2, searchTerm, limit = 20) {
    try {
      const result = await db.query(
        `SELECT
           m.*,
           s.username as sender_username,
           s.display_name as sender_display_name
         FROM messages m
         JOIN users s ON m.sender_id = s.id
         WHERE m.is_deleted = FALSE
           AND (
             (m.sender_id = $1 AND m.recipient_id = $2)
             OR (m.sender_id = $2 AND m.recipient_id = $1)
           )
           AND m.content ILIKE $3
         ORDER BY m.created_at DESC
         LIMIT $4`,
        [userId1, userId2, `%${searchTerm}%`, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error searching messages', { error: error.message });
      throw error;
    }
  }
}

module.exports = Message;
