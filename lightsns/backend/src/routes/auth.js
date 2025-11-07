const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadSingle, requireFile } = require('../middleware/upload');

/**
 * Validation rules
 */
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('display_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),

  body('phone_number')
    .optional()
    .trim()
    .matches(/^[+]?[0-9]{10,15}$/)
    .withMessage('Invalid phone number'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Username, email, or phone number is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('display_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters')
];

/**
 * Routes
 */

// @route   POST /api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerValidation, authController.register);

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, authController.login);

// @route   POST /api/v1/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', authController.refresh);

// @route   POST /api/v1/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, authController.logout);

// @route   GET /api/v1/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, authController.getMe);

// @route   PATCH /api/v1/auth/me
// @desc    Update current user
// @access  Private
router.patch('/me', protect, updateProfileValidation, authController.updateMe);

// @route   POST /api/v1/auth/me/avatar
// @desc    Upload profile avatar
// @access  Private
router.post('/me/avatar', protect, uploadSingle('avatar'), requireFile, authController.uploadAvatar);

// @route   DELETE /api/v1/auth/me/avatar
// @desc    Delete profile avatar
// @access  Private
router.delete('/me/avatar', protect, authController.deleteAvatar);

module.exports = router;
