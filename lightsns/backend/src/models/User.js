const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * User Model
 * Handles all database operations for users
 */
class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user (without password)
   */
  static async create(userData) {
    const {
      username,
      display_name,
      email,
      phone_number,
      password_hash,
      bio = null,
      avatar_url = null
    } = userData;

    try {
      const result = await db.query(
        `INSERT INTO users
         (username, display_name, email, phone_number, password_hash, bio, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, username, display_name, email, phone_number, bio,
                   avatar_url, avatar_thumbnail_url, created_at, is_verified, is_active`,
        [username, display_name, email, phone_number, password_hash, bio, avatar_url]
      );

      logger.info('User created', { userId: result.rows[0].id, username });
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user', { error: error.message, username });

      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.constraint === 'users_username_key') {
          throw new Error('Username already exists');
        } else if (error.constraint === 'users_email_key') {
          throw new Error('Email already exists');
        } else if (error.constraint === 'users_phone_number_key') {
          throw new Error('Phone number already exists');
        }
      }

      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {string} id - User ID
   * @param {boolean} includePassword - Include password hash
   * @returns {Promise<Object|null>} User or null
   */
  static async findById(id, includePassword = false) {
    try {
      const fields = includePassword
        ? '*'
        : `id, username, display_name, email, phone_number, bio,
           avatar_url, avatar_thumbnail_url, created_at, updated_at,
           last_active_at, is_verified, is_active, settings`;

      const result = await db.query(
        `SELECT ${fields} FROM users WHERE id = $1 AND is_active = true`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @param {boolean} includePassword - Include password hash
   * @returns {Promise<Object|null>} User or null
   */
  static async findByUsername(username, includePassword = false) {
    try {
      const fields = includePassword
        ? '*'
        : `id, username, display_name, email, phone_number, bio,
           avatar_url, avatar_thumbnail_url, created_at, updated_at,
           last_active_at, is_verified, is_active, settings`;

      const result = await db.query(
        `SELECT ${fields} FROM users WHERE username = $1 AND is_active = true`,
        [username]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by username', {
        error: error.message,
        username
      });
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {string} email - Email address
   * @param {boolean} includePassword - Include password hash
   * @returns {Promise<Object|null>} User or null
   */
  static async findByEmail(email, includePassword = false) {
    try {
      const fields = includePassword
        ? '*'
        : `id, username, display_name, email, phone_number, bio,
           avatar_url, avatar_thumbnail_url, created_at, updated_at,
           last_active_at, is_verified, is_active, settings`;

      const result = await db.query(
        `SELECT ${fields} FROM users WHERE email = $1 AND is_active = true`,
        [email]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email', { error: error.message });
      throw error;
    }
  }

  /**
   * Find user by phone number
   * @param {string} phoneNumber - Phone number
   * @param {boolean} includePassword - Include password hash
   * @returns {Promise<Object|null>} User or null
   */
  static async findByPhoneNumber(phoneNumber, includePassword = false) {
    try {
      const fields = includePassword
        ? '*'
        : `id, username, display_name, email, phone_number, bio,
           avatar_url, avatar_thumbnail_url, created_at, updated_at,
           last_active_at, is_verified, is_active, settings`;

      const result = await db.query(
        `SELECT ${fields} FROM users WHERE phone_number = $1 AND is_active = true`,
        [phoneNumber]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by phone', { error: error.message });
      throw error;
    }
  }

  /**
   * Update user
   * @param {string} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated user
   */
  static async update(id, updates) {
    try {
      // Filter out fields that shouldn't be updated directly
      const allowedFields = [
        'display_name',
        'bio',
        'avatar_url',
        'avatar_thumbnail_url',
        'settings'
      ];

      const updateFields = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');

      if (!updateFields) {
        throw new Error('No valid fields to update');
      }

      const values = [
        id,
        ...Object.keys(updates)
          .filter(key => allowedFields.includes(key))
          .map(key => updates[key])
      ];

      const result = await db.query(
        `UPDATE users
         SET ${updateFields}
         WHERE id = $1 AND is_active = true
         RETURNING id, username, display_name, email, phone_number, bio,
                   avatar_url, avatar_thumbnail_url, updated_at, is_verified`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      logger.info('User updated', { userId: id });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Delete user (soft delete)
   * @param {string} id - User ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(id) {
    try {
      const result = await db.query(
        'UPDATE users SET is_active = false WHERE id = $1',
        [id]
      );

      logger.info('User deleted (soft)', { userId: id });
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting user', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Get user with stats (posts, followers, following counts)
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} User with stats
   */
  static async findByIdWithStats(id) {
    try {
      const result = await db.query(
        `SELECT
           u.id, u.username, u.display_name, u.bio,
           u.avatar_url, u.avatar_thumbnail_url,
           u.created_at, u.is_verified,
           COALESCE(us.posts_count, 0) as posts_count,
           COALESCE(us.followers_count, 0) as followers_count,
           COALESCE(us.following_count, 0) as following_count
         FROM users u
         LEFT JOIN user_stats us ON u.id = us.user_id
         WHERE u.id = $1 AND u.is_active = true`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user with stats', { error: error.message, id });
      throw error;
    }
  }

  /**
   * Search users by username
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum results
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of users
   */
  static async search(searchTerm, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT id, username, display_name, avatar_thumbnail_url, is_verified
         FROM users
         WHERE (username ILIKE $1 OR display_name ILIKE $1) AND is_active = true
         ORDER BY
           CASE
             WHEN username = $2 THEN 1
             WHEN username ILIKE $3 THEN 2
             ELSE 3
           END,
           username
         LIMIT $4 OFFSET $5`,
        [`%${searchTerm}%`, searchTerm, `${searchTerm}%`, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error searching users', { error: error.message, searchTerm });
      throw error;
    }
  }
}

module.exports = User;
