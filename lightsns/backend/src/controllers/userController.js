const User = require('../models/User');
const Follow = require('../models/Follow');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const db = require('../config/database');

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user's public profile
 * @access  Public
 */
exports.getUserProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Try cache first
  const cacheKey = `user:profile:${userId}`;
  let user = await cache.get(cacheKey);

  if (!user) {
    user = await User.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get user stats
    const followerCount = await Follow.getFollowerCount(userId);
    const followingCount = await Follow.getFollowingCount(userId);

    // Get post count
    const postCountResult = await db.query(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = $1 AND is_deleted = false',
      [userId]
    );
    const postCount = parseInt(postCountResult.rows[0].count);

    user.stats = {
      followers_count: followerCount,
      following_count: followingCount,
      posts_count: postCount
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, user, 300);
  }

  // If user is authenticated, add follow status
  if (req.user) {
    user.is_following = await Follow.isFollowing(req.user.id, userId);
    user.is_follower = await Follow.isFollowing(userId, req.user.id);
  }

  // Remove sensitive data
  delete user.password_hash;
  delete user.is_active;

  res.json({
    success: true,
    data: { user }
  });
});

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users by username or display name
 * @access  Public
 */
exports.searchUsers = asyncHandler(async (req, res) => {
  const { q, limit = 20, offset = 0 } = req.query;

  if (!q || q.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const searchTerm = q.trim();

  // Cache search results
  const cacheKey = `users:search:${searchTerm}:${limit}:${offset}`;
  let users = await cache.get(cacheKey);

  if (!users) {
    users = await User.search(searchTerm, parseInt(limit), parseInt(offset));
    await cache.set(cacheKey, users, 180); // 3 minutes
  }

  // Add follow status if user is authenticated
  if (req.user) {
    for (const user of users) {
      user.is_following = await Follow.isFollowing(req.user.id, user.id);
    }
  }

  res.json({
    success: true,
    data: {
      query: searchTerm,
      users,
      hasMore: users.length === parseInt(limit)
    }
  });
});

/**
 * @route   GET /api/v1/users/:userId/stats
 * @desc    Get user statistics
 * @access  Public
 */
exports.getUserStats = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const cacheKey = `user:stats:${userId}`;
  let stats = await cache.get(cacheKey);

  if (!stats) {
    // Get all stats in parallel
    const [followerCount, followingCount, postCountResult, likeCountResult] = await Promise.all([
      Follow.getFollowerCount(userId),
      Follow.getFollowingCount(userId),
      db.query(
        'SELECT COUNT(*) as count FROM posts WHERE user_id = $1 AND is_deleted = false',
        [userId]
      ),
      db.query(
        'SELECT COUNT(*) as count FROM likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = $1 AND p.is_deleted = false',
        [userId]
      )
    ]);

    stats = {
      followers_count: followerCount,
      following_count: followingCount,
      posts_count: parseInt(postCountResult.rows[0].count),
      likes_received_count: parseInt(likeCountResult.rows[0].count)
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, stats, 300);
  }

  res.json({
    success: true,
    data: { stats }
  });
});

/**
 * @route   GET /api/v1/users/username/:username
 * @desc    Get user by username
 * @access  Public
 */
exports.getUserByUsername = asyncHandler(async (req, res) => {
  const { username } = req.params;

  const cacheKey = `user:username:${username.toLowerCase()}`;
  let user = await cache.get(cacheKey);

  if (!user) {
    user = await User.findByUsername(username);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get user stats
    const followerCount = await Follow.getFollowerCount(user.id);
    const followingCount = await Follow.getFollowingCount(user.id);

    const postCountResult = await db.query(
      'SELECT COUNT(*) as count FROM posts WHERE user_id = $1 AND is_deleted = false',
      [user.id]
    );
    const postCount = parseInt(postCountResult.rows[0].count);

    user.stats = {
      followers_count: followerCount,
      following_count: followingCount,
      posts_count: postCount
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, user, 300);
  }

  // If user is authenticated, add follow status
  if (req.user) {
    user.is_following = await Follow.isFollowing(req.user.id, user.id);
    user.is_follower = await Follow.isFollowing(user.id, req.user.id);
  }

  // Remove sensitive data
  delete user.password_hash;
  delete user.is_active;

  res.json({
    success: true,
    data: { user }
  });
});

/**
 * @route   GET /api/v1/users/popular
 * @desc    Get popular users (most followers)
 * @access  Public
 */
exports.getPopularUsers = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const cacheKey = `users:popular:${limit}`;
  let users = await cache.get(cacheKey);

  if (!users) {
    const result = await db.query(
      `SELECT u.id, u.username, u.display_name,
              u.avatar_thumbnail_url, u.is_verified,
              us.followers_count, us.posts_count
       FROM users u
       LEFT JOIN user_stats us ON u.id = us.user_id
       WHERE u.is_active = true
       ORDER BY us.followers_count DESC NULLS LAST, us.posts_count DESC NULLS LAST
       LIMIT $1`,
      [parseInt(limit)]
    );

    users = result.rows;

    // Cache for 10 minutes
    await cache.set(cacheKey, users, 600);
  }

  // Add follow status if user is authenticated
  if (req.user) {
    for (const user of users) {
      user.is_following = await Follow.isFollowing(req.user.id, user.id);
    }
  }

  res.json({
    success: true,
    data: { users }
  });
});

module.exports = exports;
