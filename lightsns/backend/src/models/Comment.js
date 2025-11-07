const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Comment Model
 * Handles all database operations for comments
 */
class Comment {
  /**
   * Create a new comment
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Created comment
   */
  static async create(commentData) {
    const {
      user_id,
      post_id,
      content,
      parent_id = null
    } = commentData;

    try {
      const result = await db.query(
        `INSERT INTO comments (user_id, post_id, content, parent_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user_id, post_id, content, parent_id]
      );

      logger.info('Comment created', {
        commentId: result.rows[0].id,
        userId: user_id,
        postId: post_id
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating comment', {
        error: error.message,
        userId: user_id,
        postId: post_id
      });
      throw error;
    }
  }

  /**
   * Find comment by ID
   * @param {string} id - Comment ID
   * @returns {Promise<Object|null>} Comment or null
   */
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT
           c.*,
           u.username, u.display_name, u.avatar_thumbnail_url, u.is_verified
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = $1 AND c.is_deleted = false`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding comment', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get comments for a post
   * @param {string} postId - Post ID
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of comments
   */
  static async findByPostId(postId, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT
           c.*,
           u.username, u.display_name, u.avatar_thumbnail_url, u.is_verified,
           (
             SELECT COUNT(*)
             FROM comments replies
             WHERE replies.parent_id = c.id AND replies.is_deleted = false
           ) as replies_count
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.post_id = $1 AND c.parent_id IS NULL AND c.is_deleted = false
         ORDER BY c.created_at DESC
         LIMIT $2 OFFSET $3`,
        [postId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding comments', { error: error.message, postId });
      throw error;
    }
  }

  /**
   * Get replies to a comment
   * @param {string} parentId - Parent comment ID
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of replies
   */
  static async findReplies(parentId, limit = 10, offset = 0) {
    try {
      const result = await db.query(
        `SELECT
           c.*,
           u.username, u.display_name, u.avatar_thumbnail_url, u.is_verified
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = $1 AND c.is_deleted = false
         ORDER BY c.created_at ASC
         LIMIT $2 OFFSET $3`,
        [parentId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error finding replies', { error: error.message, parentId });
      throw error;
    }
  }

  /**
   * Update comment
   * @param {string} id - Comment ID
   * @param {string} userId - User ID (for authorization)
   * @param {string} content - New content
   * @returns {Promise<Object>} Updated comment
   */
  static async update(id, userId, content) {
    try {
      const result = await db.query(
        `UPDATE comments
         SET content = $3
         WHERE id = $1 AND user_id = $2 AND is_deleted = false
         RETURNING *`,
        [id, userId, content]
      );

      if (result.rows.length === 0) {
        throw new Error('Comment not found or unauthorized');
      }

      logger.info('Comment updated', { commentId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating comment', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Delete comment (soft delete)
   * @param {string} id - Comment ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, userId) {
    try {
      const result = await db.query(
        `UPDATE comments
         SET is_deleted = true
         WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Comment not found or unauthorized');
      }

      logger.info('Comment deleted', { commentId: id, userId });
      return true;
    } catch (error) {
      logger.error('Error deleting comment', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get comment count for a post
   * @param {string} postId - Post ID
   * @returns {Promise<number>} Comment count
   */
  static async getCount(postId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM comments WHERE post_id = $1 AND is_deleted = false',
        [postId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting comment count', { error: error.message, postId });
      throw error;
    }
  }
}

module.exports = Comment;
