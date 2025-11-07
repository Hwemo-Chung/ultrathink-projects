const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Like Model
 * Handles all database operations for likes
 */
class Like {
  /**
   * Like a post
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @returns {Promise<Object>} Created like
   */
  static async create(userId, postId) {
    try {
      const result = await db.query(
        `INSERT INTO likes (user_id, post_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, post_id) DO NOTHING
         RETURNING *`,
        [userId, postId]
      );

      if (result.rows.length > 0) {
        logger.info('Post liked', { userId, postId });
        return result.rows[0];
      }

      // Already liked
      return null;
    } catch (error) {
      logger.error('Error liking post', { error: error.message, userId, postId });
      throw error;
    }
  }

  /**
   * Unlike a post
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(userId, postId) {
    try {
      const result = await db.query(
        'DELETE FROM likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );

      if (result.rowCount > 0) {
        logger.info('Post unliked', { userId, postId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error unliking post', { error: error.message, userId, postId });
      throw error;
    }
  }

  /**
   * Check if user liked a post
   * @param {string} userId - User ID
   * @param {string} postId - Post ID
   * @returns {Promise<boolean>} Is liked
   */
  static async isLiked(userId, postId) {
    try {
      const result = await db.query(
        'SELECT 1 FROM likes WHERE user_id = $1 AND post_id = $2',
        [userId, postId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking like', { error: error.message, userId, postId });
      throw error;
    }
  }

  /**
   * Get users who liked a post
   * @param {string} postId - Post ID
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of users
   */
  static async getLikers(postId, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT
           u.id, u.username, u.display_name,
           u.avatar_thumbnail_url, u.is_verified,
           l.created_at as liked_at
         FROM likes l
         JOIN users u ON l.user_id = u.id
         WHERE l.post_id = $1
         ORDER BY l.created_at DESC
         LIMIT $2 OFFSET $3`,
        [postId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting likers', { error: error.message, postId });
      throw error;
    }
  }

  /**
   * Get like count for a post
   * @param {string} postId - Post ID
   * @returns {Promise<number>} Like count
   */
  static async getCount(postId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM likes WHERE post_id = $1',
        [postId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting like count', { error: error.message, postId });
      throw error;
    }
  }
}

module.exports = Like;
