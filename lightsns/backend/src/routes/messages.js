const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

/**
 * Validation rules
 */
const sendMessageValidation = [
  body('recipient_id')
    .isUUID()
    .withMessage('Invalid recipient ID'),

  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters'),

  body('image_url')
    .optional()
    .isURL()
    .withMessage('Invalid image URL')
];

const userIdValidation = [
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID')
];

const messageIdValidation = [
  param('messageId')
    .isUUID()
    .withMessage('Invalid message ID')
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

// @route   GET /api/v1/messages/unread
// @desc    Get total unread message count
// @access  Private
router.get('/unread', protect, messageController.getUnreadCount);

// @route   GET /api/v1/messages/conversations
// @desc    Get all conversations
// @access  Private
router.get('/conversations', protect, messageController.getConversations);

// @route   GET /api/v1/messages/conversations/:userId
// @desc    Get conversation with a specific user
// @access  Private
router.get(
  '/conversations/:userId',
  protect,
  userIdValidation,
  messageController.getConversation
);

// @route   GET /api/v1/messages/search/:userId
// @desc    Search messages in a conversation
// @access  Private
router.get(
  '/search/:userId',
  protect,
  userIdValidation,
  searchValidation,
  messageController.searchMessages
);

// @route   GET /api/v1/messages/unread/:userId
// @desc    Get unread count for a specific conversation
// @access  Private
router.get(
  '/unread/:userId',
  protect,
  userIdValidation,
  messageController.getConversationUnreadCount
);

// @route   POST /api/v1/messages
// @desc    Send a message
// @access  Private
router.post('/', protect, sendMessageValidation, messageController.sendMessage);

// @route   POST /api/v1/messages/:userId/read
// @desc    Mark all messages from a user as read
// @access  Private
router.post(
  '/:userId/read',
  protect,
  userIdValidation,
  messageController.markConversationAsRead
);

// @route   POST /api/v1/messages/:messageId/read
// @desc    Mark a single message as read
// @access  Private
router.post(
  '/:messageId/read',
  protect,
  messageIdValidation,
  messageController.markMessageAsRead
);

// @route   DELETE /api/v1/messages/:messageId
// @desc    Delete a message
// @access  Private
router.delete(
  '/:messageId',
  protect,
  messageIdValidation,
  messageController.deleteMessage
);

module.exports = router;
