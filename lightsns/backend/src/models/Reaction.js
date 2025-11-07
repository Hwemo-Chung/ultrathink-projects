const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Emoji types - 6 reactions only
 */
const EMOJI_TYPES = {
  THUMBS_UP: '👍',
  HEART: '❤️',
  LAUGH: '😂',
  WOW: '😮',
  SAD: '😢',
  CLAP: '👏'
};

// Array for validation
const VALID_EMOJIS = Object.values(EMOJI_TYPES);

/**
 * Reaction Model
 * Handles emoji reactions to posts (replaces comments system)
 */
class Reaction {
  /**
   * Add or update a reaction
   * @param {Object} data - { post_id, user_id, emoji }
   * @returns {Promise<Object>} Reaction object
   */
  static async addReaction({ post_id, user_id, emoji }) {
    try {
      // Validate emoji
      if (!VALID_EMOJIS.includes(emoji)) {
        throw new Error('Invalid emoji type');
      }

      // Upsert: Insert or update if exists
      const result = await db.query(
        `INSERT INTO reactions (post_id, user_id, emoji)
         VALUES ($1, $2, $3)
         ON CONFLICT (post_id, user_id)
         DO UPDATE SET emoji = $3, created_at = CURRENT_TIMESTAMP
         RETURNING id, post_id, user_id, emoji, created_at`,
        [post_id, user_id, emoji]
      );

      logger.info('Reaction added/updated', {
        postId: post_id,
        userId: user_id,
        emoji
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error adding reaction', {
        error: error.message,
        postId: post_id,
        userId: user_id
      });
      throw error;
    }
  }

  /**
   * Remove a reaction
   * @param {string} post_id - Post ID
   * @param {string} user_id - User ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async removeReaction(post_id, user_id) {
    try {
      const result = await db.query(
        `DELETE FROM reactions
         WHERE post_id = $1 AND user_id = $2
         RETURNING id`,
        [post_id, user_id]
      );

      const deleted = result.rowCount > 0;

      if (deleted) {
        logger.info('Reaction removed', { postId: post_id, userId: user_id });
      }

      return deleted;
    } catch (error) {
      logger.error('Error removing reaction', {
        error: error.message,
        postId: post_id,
        userId: user_id
      });
      throw error;
    }
  }

  /**
   * Get user's reaction for a post
   * @param {string} post_id - Post ID
   * @param {string} user_id - User ID
   * @returns {Promise<Object|null>} Reaction or null
   */
  static async getUserReaction(post_id, user_id) {
    try {
      const result = await db.query(
        `SELECT id, post_id, user_id, emoji, created_at
         FROM reactions
         WHERE post_id = $1 AND user_id = $2`,
        [post_id, user_id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user reaction', {
        error: error.message,
        postId: post_id,
        userId: user_id
      });
      throw error;
    }
  }

  /**
   * Get reaction counts for a post
   * @param {string} post_id - Post ID
   * @returns {Promise<Object>} Emoji counts
   */
  static async getReactionCounts(post_id) {
    try {
      const result = await db.query(
        `SELECT
           SUM(CASE WHEN emoji = '👍' THEN 1 ELSE 0 END)::int as thumbs_up,
           SUM(CASE WHEN emoji = '❤️' THEN 1 ELSE 0 END)::int as heart,
           SUM(CASE WHEN emoji = '😂' THEN 1 ELSE 0 END)::int as laugh,
           SUM(CASE WHEN emoji = '😮' THEN 1 ELSE 0 END)::int as wow,
           SUM(CASE WHEN emoji = '😢' THEN 1 ELSE 0 END)::int as sad,
           SUM(CASE WHEN emoji = '👏' THEN 1 ELSE 0 END)::int as clap,
           COUNT(*)::int as total
         FROM reactions
         WHERE post_id = $1`,
        [post_id]
      );

      return result.rows[0] || {
        thumbs_up: 0,
        heart: 0,
        laugh: 0,
        wow: 0,
        sad: 0,
        clap: 0,
        total: 0
      };
    } catch (error) {
      logger.error('Error getting reaction counts', {
        error: error.message,
        postId: post_id
      });
      throw error;
    }
  }

  /**
   * Get reactions for multiple posts (batch)
   * @param {Array<string>} post_ids - Array of post IDs
   * @param {string} user_id - User ID (optional, to get user's reactions)
   * @returns {Promise<Object>} Map of post_id to reaction data
   */
  static async getReactionsForPosts(post_ids, user_id = null) {
    try {
      if (!post_ids || post_ids.length === 0) {
        return {};
      }

      // Get counts for all posts
      const countsResult = await db.query(
        `SELECT
           post_id,
           SUM(CASE WHEN emoji = '👍' THEN 1 ELSE 0 END)::int as thumbs_up,
           SUM(CASE WHEN emoji = '❤️' THEN 1 ELSE 0 END)::int as heart,
           SUM(CASE WHEN emoji = '😂' THEN 1 ELSE 0 END)::int as laugh,
           SUM(CASE WHEN emoji = '😮' THEN 1 ELSE 0 END)::int as wow,
           SUM(CASE WHEN emoji = '😢' THEN 1 ELSE 0 END)::int as sad,
           SUM(CASE WHEN emoji = '👏' THEN 1 ELSE 0 END)::int as clap,
           COUNT(*)::int as total
         FROM reactions
         WHERE post_id = ANY($1)
         GROUP BY post_id`,
        [post_ids]
      );

      const reactionsMap = {};
      countsResult.rows.forEach(row => {
        reactionsMap[row.post_id] = {
          counts: {
            thumbs_up: row.thumbs_up,
            heart: row.heart,
            laugh: row.laugh,
            wow: row.wow,
            sad: row.sad,
            clap: row.clap,
            total: row.total
          },
          user_reaction: null
        };
      });

      // Get user's reactions if user_id provided
      if (user_id) {
        const userReactionsResult = await db.query(
          `SELECT post_id, emoji
           FROM reactions
           WHERE post_id = ANY($1) AND user_id = $2`,
          [post_ids, user_id]
        );

        userReactionsResult.rows.forEach(row => {
          if (reactionsMap[row.post_id]) {
            reactionsMap[row.post_id].user_reaction = row.emoji;
          }
        });
      }

      // Fill in zero counts for posts with no reactions
      post_ids.forEach(postId => {
        if (!reactionsMap[postId]) {
          reactionsMap[postId] = {
            counts: {
              thumbs_up: 0,
              heart: 0,
              laugh: 0,
              wow: 0,
              sad: 0,
              clap: 0,
              total: 0
            },
            user_reaction: null
          };
        }
      });

      return reactionsMap;
    } catch (error) {
      logger.error('Error getting reactions for posts', {
        error: error.message,
        postCount: post_ids.length
      });
      throw error;
    }
  }

  /**
   * Get users who reacted to a post with specific emoji
   * @param {string} post_id - Post ID
   * @param {string} emoji - Emoji type (optional)
   * @param {number} limit - Limit results
   * @returns {Promise<Array>} Users who reacted
   */
  static async getUsersWhoReacted(post_id, emoji = null, limit = 50) {
    try {
      let query = `
        SELECT r.emoji, r.created_at,
               u.id, u.username, u.display_name, u.avatar_thumbnail_url
        FROM reactions r
        JOIN users u ON r.user_id = u.id
        WHERE r.post_id = $1
      `;
      const params = [post_id];

      if (emoji) {
        query += ` AND r.emoji = $2`;
        params.push(emoji);
      }

      query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting users who reacted', {
        error: error.message,
        postId: post_id
      });
      throw error;
    }
  }
}

module.exports = {
  Reaction,
  EMOJI_TYPES,
  VALID_EMOJIS
};
