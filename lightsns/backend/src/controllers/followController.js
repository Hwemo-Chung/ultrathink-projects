const Follow = require('../models/Follow');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');

/**
 * @route   POST /api/v1/users/:userId/follow
 * @desc    Follow a user
 * @access  Private
 */
exports.followUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Check if user exists
  const userToFollow = await User.findById(userId);
  if (!userToFollow) {
    throw new AppError('User not found', 404);
  }

  // Check if trying to follow self
  if (userId === req.user.id) {
    throw new AppError('Cannot follow yourself', 400);
  }

  const follow = await Follow.create(req.user.id, userId);

  if (!follow) {
    // Already following
    return res.json({
      success: true,
      message: 'Already following this user'
    });
  }

  // Send notification to the followed user
  await notificationService.sendFollowNotification(userId, req.user.id);

  // Invalidate relevant caches
  await cache.delPattern(`followers:${userId}:*`);
  await cache.delPattern(`following:${req.user.id}:*`);
  await cache.delPattern(`suggestions:${req.user.id}:*`);

  logger.info('User followed', { followerId: req.user.id, followingId: userId });

  res.status(201).json({
    success: true,
    message: 'User followed successfully',
    data: { follow }
  });
});

/**
 * @route   DELETE /api/v1/users/:userId/follow
 * @desc    Unfollow a user
 * @access  Private
 */
exports.unfollowUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const success = await Follow.delete(req.user.id, userId);

  if (!success) {
    throw new AppError('Not following this user', 404);
  }

  // Invalidate relevant caches
  await cache.delPattern(`followers:${userId}:*`);
  await cache.delPattern(`following:${req.user.id}:*`);
  await cache.delPattern(`suggestions:${req.user.id}:*`);

  logger.info('User unfollowed', { followerId: req.user.id, followingId: userId });

  res.json({
    success: true,
    message: 'User unfollowed successfully'
  });
});

/**
 * @route   GET /api/v1/users/:userId/followers
 * @desc    Get user's followers
 * @access  Public
 */
exports.getFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const cacheKey = `followers:${userId}:${limit}:${offset}`;
  let followers = await cache.get(cacheKey);

  if (!followers) {
    followers = await Follow.getFollowers(userId, parseInt(limit), parseInt(offset));
    await cache.set(cacheKey, followers, 300); // 5 minutes
  }

  // Add is_following status if user is authenticated
  if (req.user) {
    for (const follower of followers) {
      follower.is_following = await Follow.isFollowing(req.user.id, follower.id);
    }
  }

  res.json({
    success: true,
    data: {
      followers,
      hasMore: followers.length === parseInt(limit)
    }
  });
});

/**
 * @route   GET /api/v1/users/:userId/following
 * @desc    Get users that a user is following
 * @access  Public
 */
exports.getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  // Check if user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const cacheKey = `following:${userId}:${limit}:${offset}`;
  let following = await cache.get(cacheKey);

  if (!following) {
    following = await Follow.getFollowing(userId, parseInt(limit), parseInt(offset));
    await cache.set(cacheKey, following, 300); // 5 minutes
  }

  // Add is_following status if user is authenticated
  if (req.user) {
    for (const user of following) {
      user.is_following = await Follow.isFollowing(req.user.id, user.id);
    }
  }

  res.json({
    success: true,
    data: {
      following,
      hasMore: following.length === parseInt(limit)
    }
  });
});

/**
 * @route   GET /api/v1/users/suggestions
 * @desc    Get suggested users to follow
 * @access  Private
 */
exports.getSuggestions = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const cacheKey = `suggestions:${req.user.id}:${limit}`;
  let suggestions = await cache.get(cacheKey);

  if (!suggestions) {
    suggestions = await Follow.getSuggestions(req.user.id, parseInt(limit));
    await cache.set(cacheKey, suggestions, 600); // 10 minutes
  }

  res.json({
    success: true,
    data: {
      suggestions
    }
  });
});

/**
 * @route   GET /api/v1/users/:userId/mutual
 * @desc    Get mutual followers (users who both follow each other)
 * @access  Private
 */
exports.getMutualFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  // Can only view your own mutual followers
  if (userId !== req.user.id) {
    throw new AppError('Can only view your own mutual followers', 403);
  }

  const cacheKey = `mutual:${userId}:${limit}:${offset}`;
  let mutualFollowers = await cache.get(cacheKey);

  if (!mutualFollowers) {
    mutualFollowers = await Follow.getMutualFollowers(userId, parseInt(limit), parseInt(offset));
    await cache.set(cacheKey, mutualFollowers, 300); // 5 minutes
  }

  res.json({
    success: true,
    data: {
      mutualFollowers,
      hasMore: mutualFollowers.length === parseInt(limit)
    }
  });
});

/**
 * @route   DELETE /api/v1/users/:userId/followers/:followerId
 * @desc    Remove a follower
 * @access  Private
 */
exports.removeFollower = asyncHandler(async (req, res) => {
  const { userId, followerId } = req.params;

  // Can only remove followers from your own account
  if (userId !== req.user.id) {
    throw new AppError('Can only remove followers from your own account', 403);
  }

  const success = await Follow.removeFollower(userId, followerId);

  if (!success) {
    throw new AppError('Follower not found', 404);
  }

  // Invalidate relevant caches
  await cache.delPattern(`followers:${userId}:*`);
  await cache.delPattern(`following:${followerId}:*`);

  logger.info('Follower removed', { userId, followerId });

  res.json({
    success: true,
    message: 'Follower removed successfully'
  });
});

/**
 * @route   GET /api/v1/users/:userId/follow-status
 * @desc    Check if current user is following another user
 * @access  Private
 */
exports.getFollowStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const isFollowing = await Follow.isFollowing(req.user.id, userId);
  const isFollower = await Follow.isFollowing(userId, req.user.id);

  res.json({
    success: true,
    data: {
      isFollowing,
      isFollowedBy: isFollower,
      isMutual: isFollowing && isFollower
    }
  });
});

module.exports = exports;
