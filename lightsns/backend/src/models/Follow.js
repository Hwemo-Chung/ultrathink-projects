const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Follow Model
 * Handles all database operations for follows
 */
class Follow {
  /**
   * Follow a user
   * @param {string} followerId - User who is following
   * @param {string} followingId - User to be followed
   * @returns {Promise<Object>} Created follow relationship
   */
  static async create(followerId, followingId) {
    try {
      // Prevent self-follow
      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      const result = await db.query(
        `INSERT INTO follows (follower_id, following_id)
         VALUES ($1, $2)
         ON CONFLICT (follower_id, following_id) DO NOTHING
         RETURNING *`,
        [followerId, followingId]
      );

      if (result.rows.length > 0) {
        logger.info('User followed', { followerId, followingId });
        return result.rows[0];
      }

      // Already following
      return null;
    } catch (error) {
      logger.error('Error following user', {
        error: error.message,
        followerId,
        followingId
      });
      throw error;
    }
  }

  /**
   * Unfollow a user
   * @param {string} followerId - User who is unfollowing
   * @param {string} followingId - User to be unfollowed
   * @returns {Promise<boolean>} Success
   */
  static async delete(followerId, followingId) {
    try {
      const result = await db.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, followingId]
      );

      if (result.rowCount > 0) {
        logger.info('User unfollowed', { followerId, followingId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error unfollowing user', {
        error: error.message,
        followerId,
        followingId
      });
      throw error;
    }
  }

  /**
   * Check if user is following another user
   * @param {string} followerId - User who might be following
   * @param {string} followingId - User who might be followed
   * @returns {Promise<boolean>} Is following
   */
  static async isFollowing(followerId, followingId) {
    try {
      const result = await db.query(
        'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, followingId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking follow status', {
        error: error.message,
        followerId,
        followingId
      });
      throw error;
    }
  }

  /**
   * Get followers of a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of followers
   */
  static async getFollowers(userId, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT
           u.id, u.username, u.display_name,
           u.avatar_thumbnail_url, u.is_verified,
           f.created_at as followed_at
         FROM follows f
         JOIN users u ON f.follower_id = u.id
         WHERE f.following_id = $1 AND u.is_active = true
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting followers', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get users that a user is following
   * @param {string} userId - User ID
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of following users
   */
  static async getFollowing(userId, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT
           u.id, u.username, u.display_name,
           u.avatar_thumbnail_url, u.is_verified,
           f.created_at as followed_at
         FROM follows f
         JOIN users u ON f.following_id = u.id
         WHERE f.follower_id = $1 AND u.is_active = true
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting following', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get follower count
   * @param {string} userId - User ID
   * @returns {Promise<number>} Follower count
   */
  static async getFollowerCount(userId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM follows WHERE following_id = $1',
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting follower count', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get following count
   * @param {string} userId - User ID
   * @returns {Promise<number>} Following count
   */
  static async getFollowingCount(userId) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM follows WHERE follower_id = $1',
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting following count', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get mutual followers (users who both follow each other)
   * @param {string} userId - User ID
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of mutual followers
   */
  static async getMutualFollowers(userId, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT DISTINCT
           u.id, u.username, u.display_name,
           u.avatar_thumbnail_url, u.is_verified
         FROM follows f1
         JOIN follows f2 ON f1.follower_id = f2.following_id
           AND f1.following_id = f2.follower_id
         JOIN users u ON f1.following_id = u.id
         WHERE f1.follower_id = $1 AND u.is_active = true
         ORDER BY u.username
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting mutual followers', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Get suggested users to follow
   * Based on mutual connections and popular users
   * @param {string} userId - Current user ID
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Array of suggested users
   */
  static async getSuggestions(userId, limit = 10) {
    try {
      const result = await db.query(
        `SELECT DISTINCT
           u.id, u.username, u.display_name,
           u.avatar_thumbnail_url, u.is_verified,
           us.followers_count,
           COUNT(f2.follower_id) as mutual_count
         FROM users u
         LEFT JOIN user_stats us ON u.id = us.user_id
         LEFT JOIN follows f1 ON u.id = f1.following_id
         LEFT JOIN follows f2 ON f2.follower_id IN (
           SELECT following_id FROM follows WHERE follower_id = $1
         ) AND f2.following_id = u.id
         WHERE u.id != $1
           AND u.is_active = true
           AND NOT EXISTS (
             SELECT 1 FROM follows
             WHERE follower_id = $1 AND following_id = u.id
           )
         GROUP BY u.id, u.username, u.display_name,
                  u.avatar_thumbnail_url, u.is_verified,
                  us.followers_count
         ORDER BY mutual_count DESC, us.followers_count DESC NULLS LAST
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting follow suggestions', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Remove a follower (block follower from following you)
   * @param {string} userId - User ID
   * @param {string} followerId - Follower to remove
   * @returns {Promise<boolean>} Success
   */
  static async removeFollower(userId, followerId) {
    try {
      const result = await db.query(
        'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, userId]
      );

      if (result.rowCount > 0) {
        logger.info('Follower removed', { userId, followerId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error removing follower', {
        error: error.message,
        userId,
        followerId
      });
      throw error;
    }
  }
}

module.exports = Follow;
