const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Message = require('../models/Message');

// Store online users: userId -> Set of socket IDs
const onlineUsers = new Map();

// Store typing status: conversationKey -> Set of user IDs
const typingUsers = new Map();

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
function initializeSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      logger.error('Socket authentication failed', { error: error.message });
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    logger.info('User connected via WebSocket', {
      userId,
      socketId: socket.id
    });

    // Add user to online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Broadcast online status to user's contacts
    socket.broadcast.emit('user:online', { userId });

    // Send current online users to newly connected user
    socket.emit('users:online', {
      userIds: Array.from(onlineUsers.keys())
    });

    /**
     * Handle sending a message
     */
    socket.on('message:send', async (data, callback) => {
      try {
        const { recipientId, content, image_url } = data;

        // Create message in database
        const message = await Message.create({
          sender_id: userId,
          recipient_id: recipientId,
          content,
          image_url
        });

        // Get full message with user info
        const fullMessage = await Message.findById(message.id);

        // Send to recipient if online
        io.to(`user:${recipientId}`).emit('message:received', fullMessage);

        // Send confirmation to sender
        if (callback) {
          callback({ success: true, message: fullMessage });
        }

        logger.info('Message sent via WebSocket', {
          messageId: message.id,
          senderId: userId,
          recipientId
        });
      } catch (error) {
        logger.error('Error sending message via WebSocket', {
          error: error.message,
          userId
        });

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    /**
     * Handle typing indicator
     */
    socket.on('typing:start', ({ recipientId }) => {
      const conversationKey = getConversationKey(userId, recipientId);

      if (!typingUsers.has(conversationKey)) {
        typingUsers.set(conversationKey, new Set());
      }
      typingUsers.get(conversationKey).add(userId);

      // Notify recipient
      io.to(`user:${recipientId}`).emit('typing:start', { userId });

      logger.debug('User started typing', { userId, recipientId });
    });

    socket.on('typing:stop', ({ recipientId }) => {
      const conversationKey = getConversationKey(userId, recipientId);

      if (typingUsers.has(conversationKey)) {
        typingUsers.get(conversationKey).delete(userId);

        if (typingUsers.get(conversationKey).size === 0) {
          typingUsers.delete(conversationKey);
        }
      }

      // Notify recipient
      io.to(`user:${recipientId}`).emit('typing:stop', { userId });

      logger.debug('User stopped typing', { userId, recipientId });
    });

    /**
     * Handle read receipts
     */
    socket.on('message:read', async ({ messageId, senderId }, callback) => {
      try {
        const message = await Message.markMessageAsRead(messageId, userId);

        if (message) {
          // Notify sender that message was read
          io.to(`user:${senderId}`).emit('message:read', {
            messageId,
            readAt: message.read_at,
            readBy: userId
          });

          if (callback) {
            callback({ success: true });
          }

          logger.debug('Message marked as read', { messageId, userId });
        } else {
          if (callback) {
            callback({ success: false, error: 'Message not found or already read' });
          }
        }
      } catch (error) {
        logger.error('Error marking message as read', {
          error: error.message,
          messageId
        });

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    /**
     * Handle bulk read receipts for a conversation
     */
    socket.on('conversation:read', async ({ senderId }, callback) => {
      try {
        const count = await Message.markAsRead(userId, senderId);

        // Notify sender
        io.to(`user:${senderId}`).emit('conversation:read', {
          readBy: userId,
          count
        });

        if (callback) {
          callback({ success: true, count });
        }

        logger.debug('Conversation marked as read', {
          userId,
          senderId,
          count
        });
      } catch (error) {
        logger.error('Error marking conversation as read', {
          error: error.message,
          userId,
          senderId
        });

        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      // Remove socket from user's set
      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);

        // If no more sockets for this user, remove from online users
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);

          // Broadcast offline status
          socket.broadcast.emit('user:offline', { userId });

          logger.info('User went offline', { userId });
        }
      }

      // Clean up typing indicators
      for (const [conversationKey, users] of typingUsers.entries()) {
        if (users.has(userId)) {
          users.delete(userId);

          if (users.size === 0) {
            typingUsers.delete(conversationKey);
          }
        }
      }

      logger.info('User disconnected from WebSocket', {
        userId,
        socketId: socket.id
      });
    });

    /**
     * Handle errors
     */
    socket.on('error', (error) => {
      logger.error('Socket error', {
        error: error.message,
        userId,
        socketId: socket.id
      });
    });
  });

  return io;
}

/**
 * Get unique conversation key for two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {string} Conversation key
 */
function getConversationKey(userId1, userId2) {
  return [userId1, userId2].sort().join(':');
}

/**
 * Check if user is online
 * @param {string} userId - User ID
 * @returns {boolean} Online status
 */
function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

/**
 * Get all online users
 * @returns {Array<string>} Array of online user IDs
 */
function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

/**
 * Get online users count
 * @returns {number} Count of online users
 */
function getOnlineUsersCount() {
  return onlineUsers.size;
}

module.exports = {
  initializeSocket,
  isUserOnline,
  getOnlineUsers,
  getOnlineUsersCount
};
