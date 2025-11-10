/**
 * WebSocket Service for Real-time Features
 */

import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_CONFIG, STORAGE_KEYS} from '../constants/config';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (!token) {
        console.warn('No auth token found, cannot connect to socket');
        return;
      }

      this.socket = io(API_CONFIG.WS_URL, {
        auth: {token},
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
      });

      this.setupListeners();
      this.isConnected = true;
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }

  setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('error', error => {
      console.error('Socket error:', error);
    });

    // Message events
    this.socket.on('message:received', this.handleMessageReceived);
    this.socket.on('message:read', this.handleMessageRead);
    this.socket.on('typing:start', this.handleTypingStart);
    this.socket.on('typing:stop', this.handleTypingStop);

    // Notification events
    this.socket.on('notification:new', this.handleNewNotification);

    // User status events
    this.socket.on('user:online', this.handleUserOnline);
    this.socket.on('user:offline', this.handleUserOffline);
  }

  // Event handlers (to be overridden by consumers)
  handleMessageReceived = data => {
    console.log('New message received:', data);
  };

  handleMessageRead = data => {
    console.log('Message read:', data);
  };

  handleTypingStart = data => {
    console.log('User typing:', data);
  };

  handleTypingStop = data => {
    console.log('User stopped typing:', data);
  };

  handleNewNotification = data => {
    console.log('New notification:', data);
  };

  handleUserOnline = data => {
    console.log('User online:', data);
  };

  handleUserOffline = data => {
    console.log('User offline:', data);
  };

  // Emit events
  sendMessage(receiverId, content) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('message:send', {receiverId, content});
  }

  startTyping(userId) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('typing:start', {userId});
  }

  stopTyping(userId) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('typing:stop', {userId});
  }

  markMessageRead(messageId) {
    if (!this.isConnected || !this.socket) return;
    this.socket.emit('message:read', {messageId});
  }

  // Set custom event handlers
  on(event, handler) {
    if (!this.socket) return;
    this.socket.on(event, handler);
  }

  off(event, handler) {
    if (!this.socket) return;
    this.socket.off(event, handler);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export default new SocketService();
