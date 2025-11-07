const { Notification } = require('../models/Notification');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user's notifications
 * @access  Private
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0, unread = 'false' } = req.query;

  const unreadOnly = unread === 'true';

  const cacheKey = `notifications:${req.user.id}:${limit}:${offset}:${unreadOnly}`;
  let notifications = await cache.get(cacheKey);

  if (!notifications) {
    notifications = await Notification.getByUserId(
      req.user.id,
      parseInt(limit),
      parseInt(offset),
      unreadOnly
    );
    await cache.set(cacheKey, notifications, 60); // 1 minute cache
  }

  res.json({
    success: true,
    data: {
      notifications,
      hasMore: notifications.length === parseInt(limit)
    }
  });
});

/**
 * @route   GET /api/v1/notifications/unread/count
 * @desc    Get unread notification count
 * @access  Private
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const cacheKey = `notifications:unread:${req.user.id}`;
  let count = await cache.get(cacheKey);

  if (count === null) {
    count = await Notification.getUnreadCount(req.user.id);
    await cache.set(cacheKey, count, 30); // 30 seconds cache
  }

  res.json({
    success: true,
    data: { count }
  });
});

/**
 * @route   POST /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await Notification.markAsRead(id, req.user.id);

  if (!notification) {
    throw new AppError('Notification not found or already read', 404);
  }

  // Invalidate caches
  await cache.delPattern(`notifications:${req.user.id}:*`);
  await cache.del(`notifications:unread:${req.user.id}`);

  logger.info('Notification marked as read', {
    notificationId: id,
    userId: req.user.id
  });

  res.json({
    success: true,
    message: 'Notification marked as read',
    data: { notification }
  });
});

/**
 * @route   POST /api/v1/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const count = await Notification.markAllAsRead(req.user.id);

  // Invalidate caches
  await cache.delPattern(`notifications:${req.user.id}:*`);
  await cache.del(`notifications:unread:${req.user.id}`);

  logger.info('All notifications marked as read', {
    userId: req.user.id,
    count
  });

  res.json({
    success: true,
    message: `Marked ${count} notification(s) as read`,
    data: { count }
  });
});

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Notification.delete(id, req.user.id);

  // Invalidate caches
  await cache.delPattern(`notifications:${req.user.id}:*`);
  await cache.del(`notifications:unread:${req.user.id}`);

  logger.info('Notification deleted', {
    notificationId: id,
    userId: req.user.id
  });

  res.json({
    success: true,
    message: 'Notification deleted successfully'
  });
});

/**
 * @route   DELETE /api/v1/notifications
 * @desc    Delete all notifications
 * @access  Private
 */
exports.deleteAllNotifications = asyncHandler(async (req, res) => {
  const count = await Notification.deleteAll(req.user.id);

  // Invalidate caches
  await cache.delPattern(`notifications:${req.user.id}:*`);
  await cache.del(`notifications:unread:${req.user.id}`);

  logger.info('All notifications deleted', {
    userId: req.user.id,
    count
  });

  res.json({
    success: true,
    message: `Deleted ${count} notification(s)`,
    data: { count }
  });
});

module.exports = exports;
