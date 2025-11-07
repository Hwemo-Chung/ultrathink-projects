const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Notification types
 */
const NotificationType = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  MESSAGE: 'message',
  MENTION: 'mention',
  REPLY: 'reply'
};

/**
 * Notification Model
 * Handles all database operations for notifications
 */
class Notification {
  /**
   * Create a notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Created notification
   */
  static async create(notificationData) {
    const {
      user_id,
      type,
      actor_id,
      post_id = null,
      comment_id = null,
      message = null
    } = notificationData;

    try {
      // Don't create notification if actor is the same as user (self-action)
      if (user_id === actor_id) {
        return null;
      }

      const result = await db.query(
        `INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id, message)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [user_id, type, actor_id, post_id, comment_id, message]
      );

      logger.info('Notification created', {
        notificationId: result.rows[0].id,
        userId: user_id,
        type
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification', { error: error.message });
      throw error;
    }
  }

  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @param {boolean} unreadOnly - Only get unread notifications
   * @returns {Promise<Array>} Array of notifications
   */
  static async getByUserId(userId, limit = 20, offset = 0, unreadOnly = false) {
    try {
      let query = `
        SELECT
          n.*,
          u.username as actor_username,
          u.display_name as actor_display_name,
          u.avatar_thumbnail_url as actor_avatar,
          u.is_verified as actor_verified,
          p.content as post_content,
          c.content as comment_content
        FROM notifications n
        LEFT JOIN users u ON n.actor_id = u.id
        LEFT JOIN posts p ON n.post_id = p.id
        LEFT JOIN comments c ON n.comment_id = c.id
        WHERE n.user_id = $1
      `;

      const params = [userId];

      if (unreadOnly) {
        query += ' AND n.is_read = FALSE';
      }

      query += ` ORDER BY n.created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      return result.rows;
    } catch (error) {
      logger.error('Error getting notifications', { error: error.message });
      throw error;
    }
  }

  /**
   * Get unread notification count
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(userId) {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count
         FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting unread count', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (must be owner)
   * @returns {Promise<Object|null>} Updated notification or null
   */
  static async markAsRead(notificationId, userId) {
    try {
      const result = await db.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE id = $1 AND user_id = $2 AND is_read = FALSE
         RETURNING *`,
        [notificationId, userId]
      );

      if (result.rows.length > 0) {
        logger.info('Notification marked as read', { notificationId, userId });
      }

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error marking notification as read', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of notifications marked as read
   */
  static async markAllAsRead(userId) {
    try {
      const result = await db.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );

      logger.info('All notifications marked as read', {
        userId,
        count: result.rowCount
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Error marking all notifications as read', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (must be owner)
   * @returns {Promise<boolean>} Success
   */
  static async delete(notificationId, userId) {
    try {
      const result = await db.query(
        `DELETE FROM notifications
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Notification not found or unauthorized');
      }

      logger.info('Notification deleted', { notificationId, userId });
      return true;
    } catch (error) {
      logger.error('Error deleting notification', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of notifications deleted
   */
  static async deleteAll(userId) {
    try {
      const result = await db.query(
        `DELETE FROM notifications
         WHERE user_id = $1`,
        [userId]
      );

      logger.info('All notifications deleted', {
        userId,
        count: result.rowCount
      });

      return result.rowCount;
    } catch (error) {
      logger.error('Error deleting all notifications', { error: error.message });
      throw error;
    }
  }

  /**
   * Find notification by ID
   * @param {string} id - Notification ID
   * @returns {Promise<Object|null>} Notification or null
   */
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT
           n.*,
           u.username as actor_username,
           u.display_name as actor_display_name,
           u.avatar_thumbnail_url as actor_avatar,
           u.is_verified as actor_verified
         FROM notifications n
         LEFT JOIN users u ON n.actor_id = u.id
         WHERE n.id = $1`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding notification', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Check if notification exists for specific action (prevent duplicates)
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} Existing notification or null
   */
  static async findExisting(criteria) {
    const { user_id, type, actor_id, post_id, comment_id } = criteria;

    try {
      const result = await db.query(
        `SELECT *
         FROM notifications
         WHERE user_id = $1
           AND type = $2
           AND actor_id = $3
           AND (post_id = $4 OR ($4 IS NULL AND post_id IS NULL))
           AND (comment_id = $5 OR ($5 IS NULL AND comment_id IS NULL))
           AND created_at > NOW() - INTERVAL '24 hours'
         LIMIT 1`,
        [user_id, type, actor_id, post_id || null, comment_id || null]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding existing notification', { error: error.message });
      throw error;
    }
  }

  /**
   * Create notification for like
   * @param {string} postOwnerId - Post owner ID
   * @param {string} likerId - Liker ID
   * @param {string} postId - Post ID
   * @returns {Promise<Object|null>} Created notification or null
   */
  static async createLikeNotification(postOwnerId, likerId, postId) {
    // Check if already exists
    const existing = await this.findExisting({
      user_id: postOwnerId,
      type: NotificationType.LIKE,
      actor_id: likerId,
      post_id: postId
    });

    if (existing) {
      return null;
    }

    return this.create({
      user_id: postOwnerId,
      type: NotificationType.LIKE,
      actor_id: likerId,
      post_id: postId
    });
  }

  /**
   * Create notification for comment
   * @param {string} postOwnerId - Post owner ID
   * @param {string} commenterId - Commenter ID
   * @param {string} postId - Post ID
   * @param {string} commentId - Comment ID
   * @returns {Promise<Object|null>} Created notification or null
   */
  static async createCommentNotification(postOwnerId, commenterId, postId, commentId) {
    return this.create({
      user_id: postOwnerId,
      type: NotificationType.COMMENT,
      actor_id: commenterId,
      post_id: postId,
      comment_id: commentId
    });
  }

  /**
   * Create notification for reply
   * @param {string} commentOwnerId - Comment owner ID
   * @param {string} replierId - Replier ID
   * @param {string} postId - Post ID
   * @param {string} commentId - Comment ID (reply)
   * @returns {Promise<Object|null>} Created notification or null
   */
  static async createReplyNotification(commentOwnerId, replierId, postId, commentId) {
    return this.create({
      user_id: commentOwnerId,
      type: NotificationType.REPLY,
      actor_id: replierId,
      post_id: postId,
      comment_id: commentId
    });
  }

  /**
   * Create notification for follow
   * @param {string} followedUserId - Followed user ID
   * @param {string} followerId - Follower ID
   * @returns {Promise<Object|null>} Created notification or null
   */
  static async createFollowNotification(followedUserId, followerId) {
    // Check if already exists
    const existing = await this.findExisting({
      user_id: followedUserId,
      type: NotificationType.FOLLOW,
      actor_id: followerId
    });

    if (existing) {
      return null;
    }

    return this.create({
      user_id: followedUserId,
      type: NotificationType.FOLLOW,
      actor_id: followerId
    });
  }

  /**
   * Create notification for message
   * @param {string} recipientId - Recipient ID
   * @param {string} senderId - Sender ID
   * @param {string} messagePreview - Message preview
   * @returns {Promise<Object|null>} Created notification or null
   */
  static async createMessageNotification(recipientId, senderId, messagePreview) {
    return this.create({
      user_id: recipientId,
      type: NotificationType.MESSAGE,
      actor_id: senderId,
      message: messagePreview
    });
  }
}

module.exports = { Notification, NotificationType };
