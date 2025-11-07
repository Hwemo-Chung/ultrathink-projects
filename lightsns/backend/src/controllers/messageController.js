const Message = require('../models/Message');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');

/**
 * @route   POST /api/v1/messages
 * @desc    Send a message
 * @access  Private
 */
exports.sendMessage = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const { recipient_id, content, image_url } = req.body;

  const message = await Message.create({
    sender_id: req.user.id,
    recipient_id,
    content,
    image_url
  });

  // Get full message with user info
  const fullMessage = await Message.findById(message.id);

  // Send notification to recipient
  await notificationService.sendMessageNotification(
    recipient_id,
    req.user.id,
    content.substring(0, 50)
  );

  // Invalidate conversations cache
  await cache.delPattern(`conversations:${req.user.id}:*`);
  await cache.delPattern(`conversations:${recipient_id}:*`);

  logger.info('Message sent', {
    messageId: message.id,
    senderId: req.user.id,
    recipientId: recipient_id
  });

  res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { message: fullMessage }
  });
});

/**
 * @route   GET /api/v1/messages/conversations
 * @desc    Get all conversations for current user
 * @access  Private
 */
exports.getConversations = asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  const cacheKey = `conversations:${req.user.id}:${limit}:${offset}`;
  let conversations = await cache.get(cacheKey);

  if (!conversations) {
    conversations = await Message.getConversations(
      req.user.id,
      parseInt(limit),
      parseInt(offset)
    );
    await cache.set(cacheKey, conversations, 60); // 1 minute cache
  }

  res.json({
    success: true,
    data: {
      conversations,
      hasMore: conversations.length === parseInt(limit)
    }
  });
});

/**
 * @route   GET /api/v1/messages/conversations/:userId
 * @desc    Get conversation with a specific user
 * @access  Private
 */
exports.getConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50, cursor } = req.query;

  const cacheKey = `conversation:${req.user.id}:${userId}:${limit}:${cursor || 'initial'}`;
  let messages = await cache.get(cacheKey);

  if (!messages) {
    messages = await Message.getConversation(
      req.user.id,
      userId,
      parseInt(limit),
      cursor
    );
    await cache.set(cacheKey, messages, 180); // 3 minutes cache
  }

  res.json({
    success: true,
    data: {
      messages,
      hasMore: messages.length === parseInt(limit)
    }
  });
});

/**
 * @route   POST /api/v1/messages/:userId/read
 * @desc    Mark all messages from a user as read
 * @access  Private
 */
exports.markConversationAsRead = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const count = await Message.markAsRead(req.user.id, userId);

  // Invalidate caches
  await cache.delPattern(`conversations:${req.user.id}:*`);
  await cache.delPattern(`conversation:${req.user.id}:${userId}:*`);
  await cache.del(`unread:${req.user.id}`);

  logger.info('Conversation marked as read', {
    userId: req.user.id,
    senderId: userId,
    count
  });

  res.json({
    success: true,
    message: `Marked ${count} message(s) as read`,
    data: { count }
  });
});

/**
 * @route   POST /api/v1/messages/:messageId/read
 * @desc    Mark a single message as read
 * @access  Private
 */
exports.markMessageAsRead = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.markMessageAsRead(messageId, req.user.id);

  if (!message) {
    throw new AppError('Message not found or already read', 404);
  }

  // Invalidate caches
  await cache.delPattern(`conversations:${req.user.id}:*`);
  await cache.del(`unread:${req.user.id}`);

  logger.info('Message marked as read', {
    messageId,
    userId: req.user.id
  });

  res.json({
    success: true,
    message: 'Message marked as read',
    data: { message }
  });
});

/**
 * @route   GET /api/v1/messages/unread
 * @desc    Get unread message count
 * @access  Private
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const cacheKey = `unread:${req.user.id}`;
  let count = await cache.get(cacheKey);

  if (count === null) {
    count = await Message.getUnreadCount(req.user.id);
    await cache.set(cacheKey, count, 30); // 30 seconds cache
  }

  res.json({
    success: true,
    data: { count }
  });
});

/**
 * @route   GET /api/v1/messages/unread/:userId
 * @desc    Get unread message count for a specific conversation
 * @access  Private
 */
exports.getConversationUnreadCount = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const count = await Message.getConversationUnreadCount(req.user.id, userId);

  res.json({
    success: true,
    data: { count }
  });
});

/**
 * @route   DELETE /api/v1/messages/:messageId
 * @desc    Delete a message
 * @access  Private
 */
exports.deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  await Message.delete(messageId, req.user.id);

  // Invalidate caches
  await cache.delPattern(`conversations:${req.user.id}:*`);
  await cache.delPattern(`conversation:${req.user.id}:*`);

  logger.info('Message deleted', {
    messageId,
    userId: req.user.id
  });

  res.json({
    success: true,
    message: 'Message deleted successfully'
  });
});

/**
 * @route   GET /api/v1/messages/search/:userId
 * @desc    Search messages in a conversation
 * @access  Private
 */
exports.searchMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { q, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const messages = await Message.searchInConversation(
    req.user.id,
    userId,
    q.trim(),
    parseInt(limit)
  );

  res.json({
    success: true,
    data: {
      query: q,
      messages,
      count: messages.length
    }
  });
});

module.exports = exports;
