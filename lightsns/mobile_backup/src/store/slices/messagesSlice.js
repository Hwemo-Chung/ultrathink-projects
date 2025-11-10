/**
 * Messages Slice
 */

import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  conversations: [],
  messages: {},
  unreadCount: 0,
  loading: false,
  error: null,
};

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action) => {
      const exists = state.conversations.find(
        c => c.userId === action.payload.userId,
      );
      if (!exists) {
        state.conversations = [action.payload, ...state.conversations];
      }
    },
    updateConversation: (state, action) => {
      const index = state.conversations.findIndex(
        c => c.userId === action.payload.userId,
      );
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          ...action.payload,
        };
      }
    },
    setMessages: (state, action) => {
      const {userId, messages} = action.payload;
      state.messages[userId] = messages;
    },
    appendMessage: (state, action) => {
      const {userId, message} = action.payload;
      if (!state.messages[userId]) {
        state.messages[userId] = [];
      }
      state.messages[userId].push(message);
    },
    prependMessages: (state, action) => {
      const {userId, messages} = action.payload;
      if (!state.messages[userId]) {
        state.messages[userId] = [];
      }
      state.messages[userId] = [...messages, ...state.messages[userId]];
    },
    markAsRead: (state, action) => {
      const userId = action.payload;
      if (state.messages[userId]) {
        state.messages[userId] = state.messages[userId].map(msg => ({
          ...msg,
          is_read: true,
        }));
      }
      const conversation = state.conversations.find(c => c.userId === userId);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    incrementUnreadCount: state => {
      state.unreadCount += 1;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: state => {
      state.error = null;
    },
  },
});

export const {
  setConversations,
  addConversation,
  updateConversation,
  setMessages,
  appendMessage,
  prependMessages,
  markAsRead,
  setUnreadCount,
  incrementUnreadCount,
  setLoading,
  setError,
  clearError,
} = messagesSlice.actions;

export default messagesSlice.reducer;

// Selectors
export const selectConversations = state => state.messages.conversations;
export const selectMessages = userId => state => state.messages.messages[userId] || [];
export const selectUnreadCount = state => state.messages.unreadCount;
export const selectMessagesLoading = state => state.messages.loading;
