const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Post Model
 * Handles all database operations for posts
 */
class Post {
  /**
   * Create a new post
   * @param {Object} postData - Post data
   * @returns {Promise<Object>} Created post
   */
  static async create(postData) {
    const {
      user_id,
      content,
      image_url = null,
      image_thumbnail_url = null,
      image_metadata = null,
      location = null,
      hashtags = []
    } = postData;

    try {
      const result = await db.query(
        `INSERT INTO posts
         (user_id, content, image_url, image_thumbnail_url, image_metadata, location, hashtags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, user_id, content, image_url, image_thumbnail_url,
                   image_metadata, location, hashtags, created_at, is_deleted`,
        [user_id, content, image_url, image_thumbnail_url, image_metadata, location, hashtags]
      );

      logger.info('Post created', { postId: result.rows[0].id, userId: user_id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating post', { error: error.message, userId: user_id });
      throw error;
    }
  }

  /**
   * Find post by ID
   * @param {string} id - Post ID
   * @returns {Promise<Object|null>} Post or null
   */
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT
           p.*,
           u.username, u.display_name, u.avatar_thumbnail_url, u.is_verified,
           COALESCE(ps.likes_count, 0) as likes_count,
           COALESCE(ps.comments_count, 0) as comments_count
         FROM posts p
         JOIN users u ON p.user_id = u.id
         LEFT JOIN post_stats ps ON p.id = ps.post_id
         WHERE p.id = $1 AND p.is_deleted = false`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding post', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Find posts by user ID
   * @param {string} userId - User ID
   * @param {number} limit - Maximum results
   * @param {string} cursor - Pagination cursor (post ID)
   * @returns {Promise<Array>} Array of posts
   */
  static async findByUserId(userId, limit = 20, cursor = null) {
    try {
      let query = `
        SELECT
          p.*,
          u.username, u.display_name, u.avatar_thumbnail_url, u.is_verified,
          COALESCE(ps.likes_count, 0) as likes_count,
          COALESCE(ps.comments_count, 0) as comments_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_stats ps ON p.id = ps.post_id
        WHERE p.user_id = $1 AND p.is_deleted = false
      `;

      const params = [userId];

      if (cursor) {
        query += ` AND p.created_at < (SELECT created_at FROM posts WHERE id = $2)`;
        params.push(cursor);
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding user posts', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get feed posts (from followed users)
   * @param {string} userId - Current user ID
   * @param {number} limit - Maximum results
   * @param {string} cursor - Pagination cursor
   * @returns {Promise<Array>} Array of posts
   */
  static async getFeed(userId, limit = 20, cursor = null) {
    try {
      let query = `
        SELECT
          p.*,
          u.username, u.display_name, u.avatar_thumbnail_url, u.is_verified,
          COALESCE(ps.likes_count, 0) as likes_count,
          COALESCE(ps.comments_count, 0) as comments_count,
          EXISTS(
            SELECT 1 FROM likes l
            WHERE l.post_id = p.id AND l.user_id = $1
          ) as is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_stats ps ON p.id = ps.post_id
        WHERE p.is_deleted = false
          AND (
            p.user_id = $1
            OR p.user_id IN (
              SELECT following_id FROM follows WHERE follower_id = $1
            )
          )
      `;

      const params = [userId];

      if (cursor) {
        query += ` AND p.created_at < (SELECT created_at FROM posts WHERE id = $2)`;
        params.push(cursor);
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting feed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update post
   * @param {string} id - Post ID
   * @param {string} userId - User ID (for authorization)
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated post
   */
  static async update(id, userId, updates) {
    try {
      const allowedFields = ['content', 'location'];
      const updateFields = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .map((key, index) => `${key} = $${index + 3}`)
        .join(', ');

      if (!updateFields) {
        throw new Error('No valid fields to update');
      }

      const values = [
        id,
        userId,
        ...Object.keys(updates)
          .filter(key => allowedFields.includes(key))
          .map(key => updates[key])
      ];

      const result = await db.query(
        `UPDATE posts
         SET ${updateFields}
         WHERE id = $1 AND user_id = $2 AND is_deleted = false
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Post not found or unauthorized');
      }

      logger.info('Post updated', { postId: id, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating post', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Delete post (soft delete)
   * @param {string} id - Post ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} Success
   */
  static async delete(id, userId) {
    try {
      const result = await db.query(
        `UPDATE posts
         SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Post not found or unauthorized');
      }

      logger.info('Post deleted', { postId: id, userId });
      return true;
    } catch (error) {
      logger.error('Error deleting post', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Search posts by hashtag
   * @param {string} hashtag - Hashtag to search
   * @param {number} limit - Maximum results
   * @param {string} cursor - Pagination cursor
   * @returns {Promise<Array>} Array of posts
   */
  static async searchByHashtag(hashtag, limit = 20, cursor = null) {
    try {
      let query = `
        SELECT
          p.*,
          u.username, u.display_name, u.avatar_thumbnail_url, u.is_verified,
          COALESCE(ps.likes_count, 0) as likes_count,
          COALESCE(ps.comments_count, 0) as comments_count
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_stats ps ON p.id = ps.post_id
        WHERE p.is_deleted = false AND $1 = ANY(p.hashtags)
      `;

      const params = [hashtag];

      if (cursor) {
        query += ` AND p.created_at < (SELECT created_at FROM posts WHERE id = $2)`;
        params.push(cursor);
      }

      query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error searching posts by hashtag', {
        error: error.message,
        hashtag
      });
      throw error;
    }
  }

  /**
   * Get post count for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} Post count
   */
  static async getCountByUser(userId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM posts WHERE user_id = $1 AND is_deleted = false',
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting post count', { error: error.message, userId });
      throw error;
    }
  }
}

module.exports = Post;
