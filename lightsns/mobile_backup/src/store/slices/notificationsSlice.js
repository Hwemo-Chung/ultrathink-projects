/**
 * Notifications Slice
 */

import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshing: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload;
    },
    appendNotifications: (state, action) => {
      state.notifications = [...state.notifications, ...action.payload];
    },
    prependNotification: (state, action) => {
      state.notifications = [action.payload, ...state.notifications];
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        notification.is_read = true;
        state.unreadCount = Math.max(state.unreadCount - 1, 0);
      }
    },
    markAllAsRead: state => {
      state.notifications = state.notifications.map(n => ({
        ...n,
        is_read: true,
      }));
      state.unreadCount = 0;
    },
    removeNotification: (state, action) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        state.unreadCount = Math.max(state.unreadCount - 1, 0);
      }
      state.notifications = state.notifications.filter(
        n => n.id !== notificationId,
      );
    },
    clearAllNotifications: state => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setRefreshing: (state, action) => {
      state.refreshing = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
      state.refreshing = false;
    },
    clearError: state => {
      state.error = null;
    },
  },
});

export const {
  setNotifications,
  appendNotifications,
  prependNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  setUnreadCount,
  setLoading,
  setRefreshing,
  setError,
  clearError,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;

// Selectors
export const selectNotifications = state => state.notifications.notifications;
export const selectUnreadNotificationsCount = state =>
  state.notifications.unreadCount;
export const selectNotificationsLoading = state => state.notifications.loading;
export const selectNotificationsRefreshing = state =>
  state.notifications.refreshing;
