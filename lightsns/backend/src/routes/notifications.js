const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

/**
 * Validation rules
 */
const notificationIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid notification ID')
];

/**
 * Routes
 */

// @route   GET /api/v1/notifications/unread/count
// @desc    Get unread notification count
// @access  Private
router.get('/unread/count', protect, notificationController.getUnreadCount);

// @route   POST /api/v1/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.post('/read-all', protect, notificationController.markAllAsRead);

// @route   GET /api/v1/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', protect, notificationController.getNotifications);

// @route   DELETE /api/v1/notifications
// @desc    Delete all notifications
// @access  Private
router.delete('/', protect, notificationController.deleteAllNotifications);

// @route   POST /api/v1/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.post(
  '/:id/read',
  protect,
  notificationIdValidation,
  notificationController.markAsRead
);

// @route   DELETE /api/v1/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete(
  '/:id',
  protect,
  notificationIdValidation,
  notificationController.deleteNotification
);

module.exports = router;
