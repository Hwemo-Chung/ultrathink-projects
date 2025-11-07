const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const followController = require('../controllers/followController');
const { protect, optionalAuth } = require('../middleware/auth');

/**
 * Validation rules
 */
const userIdValidation = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID')
];

const followerIdValidation = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID'),
  param('followerId')
    .isUUID()
    .withMessage('Invalid follower ID')
];

/**
 * Routes
 */

// @route   GET /api/v1/follows/suggestions
// @desc    Get suggested users to follow
// @access  Private
router.get('/suggestions', protect, followController.getSuggestions);

// @route   POST /api/v1/follows/:userId
// @desc    Follow a user
// @access  Private
router.post('/:userId', protect, userIdValidation, followController.followUser);

// @route   DELETE /api/v1/follows/:userId
// @desc    Unfollow a user
// @access  Private
router.delete('/:userId', protect, userIdValidation, followController.unfollowUser);

// @route   GET /api/v1/follows/:userId/followers
// @desc    Get user's followers
// @access  Public
router.get('/:userId/followers', optionalAuth, userIdValidation, followController.getFollowers);

// @route   GET /api/v1/follows/:userId/following
// @desc    Get users that a user is following
// @access  Public
router.get('/:userId/following', optionalAuth, userIdValidation, followController.getFollowing);

// @route   GET /api/v1/follows/:userId/mutual
// @desc    Get mutual followers
// @access  Private
router.get('/:userId/mutual', protect, userIdValidation, followController.getMutualFollowers);

// @route   GET /api/v1/follows/:userId/status
// @desc    Check follow status between current user and another user
// @access  Private
router.get('/:userId/status', protect, userIdValidation, followController.getFollowStatus);

// @route   DELETE /api/v1/follows/:userId/followers/:followerId
// @desc    Remove a follower
// @access  Private
router.delete(
  '/:userId/followers/:followerId',
  protect,
  followerIdValidation,
  followController.removeFollower
);

module.exports = router;
