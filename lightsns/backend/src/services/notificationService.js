const { Notification, NotificationType } = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Notification Service
 * Handles creating and emitting real-time notifications
 */
class NotificationService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize notification service with Socket.IO instance
   * @param {Object} io - Socket.IO instance
   */
  init(io) {
    this.io = io;
    logger.info('Notification service initialized');
  }

  /**
   * Emit notification to user via WebSocket
   * @param {string} userId - User ID to emit to
   * @param {Object} notification - Notification object
   */
  emitToUser(userId, notification) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit('notification:new', notification);
      logger.debug('Notification emitted to user', { userId, notificationId: notification.id });
    }
  }

  /**
   * Send like notification
   * @param {string} postOwnerId - Post owner ID
   * @param {string} likerId - Liker ID
   * @param {string} postId - Post ID
   */
  async sendLikeNotification(postOwnerId, likerId, postId) {
    try {
      const notification = await Notification.createLikeNotification(
        postOwnerId,
        likerId,
        postId
      );

      if (notification) {
        // Get full notification with actor info
        const fullNotification = await Notification.findById(notification.id);
        this.emitToUser(postOwnerId, fullNotification);
      }
    } catch (error) {
      logger.error('Error sending like notification', { error: error.message });
    }
  }

  /**
   * Send comment notification
   * @param {string} postOwnerId - Post owner ID
   * @param {string} commenterId - Commenter ID
   * @param {string} postId - Post ID
   * @param {string} commentId - Comment ID
   */
  async sendCommentNotification(postOwnerId, commenterId, postId, commentId) {
    try {
      const notification = await Notification.createCommentNotification(
        postOwnerId,
        commenterId,
        postId,
        commentId
      );

      if (notification) {
        const fullNotification = await Notification.findById(notification.id);
        this.emitToUser(postOwnerId, fullNotification);
      }
    } catch (error) {
      logger.error('Error sending comment notification', { error: error.message });
    }
  }

  /**
   * Send reply notification
   * @param {string} commentOwnerId - Comment owner ID
   * @param {string} replierId - Replier ID
   * @param {string} postId - Post ID
   * @param {string} commentId - Comment ID (reply)
   */
  async sendReplyNotification(commentOwnerId, replierId, postId, commentId) {
    try {
      const notification = await Notification.createReplyNotification(
        commentOwnerId,
        replierId,
        postId,
        commentId
      );

      if (notification) {
        const fullNotification = await Notification.findById(notification.id);
        this.emitToUser(commentOwnerId, fullNotification);
      }
    } catch (error) {
      logger.error('Error sending reply notification', { error: error.message });
    }
  }

  /**
   * Send follow notification
   * @param {string} followedUserId - Followed user ID
   * @param {string} followerId - Follower ID
   */
  async sendFollowNotification(followedUserId, followerId) {
    try {
      const notification = await Notification.createFollowNotification(
        followedUserId,
        followerId
      );

      if (notification) {
        const fullNotification = await Notification.findById(notification.id);
        this.emitToUser(followedUserId, fullNotification);
      }
    } catch (error) {
      logger.error('Error sending follow notification', { error: error.message });
    }
  }

  /**
   * Send message notification
   * @param {string} recipientId - Recipient ID
   * @param {string} senderId - Sender ID
   * @param {string} messagePreview - Message preview
   */
  async sendMessageNotification(recipientId, senderId, messagePreview) {
    try {
      // Only create notification if recipient is not online/in chat
      // This can be enhanced with more sophisticated logic
      const notification = await Notification.createMessageNotification(
        recipientId,
        senderId,
        messagePreview
      );

      if (notification) {
        const fullNotification = await Notification.findById(notification.id);
        this.emitToUser(recipientId, fullNotification);
      }
    } catch (error) {
      logger.error('Error sending message notification', { error: error.message });
    }
  }
}

// Export singleton instance
module.exports = new NotificationService();
