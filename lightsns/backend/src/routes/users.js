const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const userController = require('../controllers/userController');
const { optionalAuth } = require('../middleware/auth');

/**
 * Validation rules
 */
const userIdValidation = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID')
];

const usernameValidation = [
  param('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
];

const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters')
];

/**
 * Routes
 */

// @route   GET /api/v1/users/search
// @desc    Search users
// @access  Public
router.get('/search', optionalAuth, searchValidation, userController.searchUsers);

// @route   GET /api/v1/users/popular
// @desc    Get popular users
// @access  Public
router.get('/popular', optionalAuth, userController.getPopularUsers);

// @route   GET /api/v1/users/username/:username
// @desc    Get user by username
// @access  Public
router.get('/username/:username', optionalAuth, usernameValidation, userController.getUserByUsername);

// @route   GET /api/v1/users/:userId
// @desc    Get user's public profile
// @access  Public
router.get('/:userId', optionalAuth, userIdValidation, userController.getUserProfile);

// @route   GET /api/v1/users/:userId/stats
// @desc    Get user statistics
// @access  Public
router.get('/:userId/stats', userIdValidation, userController.getUserStats);

module.exports = router;
