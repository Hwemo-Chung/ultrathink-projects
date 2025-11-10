/**
 * API Endpoint Functions
 */

import apiClient from './client';

// ========== AUTH ENDPOINTS ==========
export const authAPI = {
  register: data => apiClient.post('/auth/register', data),
  login: data => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  refreshToken: refreshToken =>
    apiClient.post('/auth/refresh', {refreshToken}),
  getMe: () => apiClient.get('/auth/me'),
  updateProfile: data => apiClient.patch('/auth/me', data),
  uploadAvatar: formData =>
    apiClient.post('/auth/me/avatar', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    }),
  deleteAvatar: () => apiClient.delete('/auth/me/avatar'),
};

// ========== POSTS ENDPOINTS ==========
export const postsAPI = {
  getFeed: params => apiClient.get('/posts/feed', {params}),
  getPost: postId => apiClient.get(`/posts/${postId}`),
  getUserPosts: (userId, params) =>
    apiClient.get(`/posts/user/${userId}`, {params}),
  createPost: data => apiClient.post('/posts', data),
  updatePost: (postId, data) => apiClient.patch(`/posts/${postId}`, data),
  deletePost: postId => apiClient.delete(`/posts/${postId}`),

  // Likes
  likePost: postId => apiClient.post(`/posts/${postId}/like`),
  unlikePost: postId => apiClient.delete(`/posts/${postId}/like`),
  getPostLikes: (postId, params) =>
    apiClient.get(`/posts/${postId}/likes`, {params}),

  // Comments
  getComments: (postId, params) =>
    apiClient.get(`/posts/${postId}/comments`, {params}),
  createComment: (postId, data) =>
    apiClient.post(`/posts/${postId}/comments`, data),
  deleteComment: commentId => apiClient.delete(`/posts/comments/${commentId}`),
  getReplies: (commentId, params) =>
    apiClient.get(`/posts/comments/${commentId}/replies`, {params}),

  // Hashtags
  searchByHashtag: (hashtag, params) =>
    apiClient.get(`/posts/hashtag/${hashtag}`, {params}),
};

// ========== USERS ENDPOINTS ==========
export const usersAPI = {
  getUser: userId => apiClient.get(`/users/${userId}`),
  getUserByUsername: username => apiClient.get(`/users/username/${username}`),
  searchUsers: params => apiClient.get('/users/search', {params}),
  getUserStats: userId => apiClient.get(`/users/${userId}/stats`),
  getPopularUsers: params => apiClient.get('/users/popular', {params}),
};

// ========== FOLLOWS ENDPOINTS ==========
export const followsAPI = {
  followUser: userId => apiClient.post(`/follows/${userId}`),
  unfollowUser: userId => apiClient.delete(`/follows/${userId}`),
  getFollowers: (userId, params) =>
    apiClient.get(`/follows/${userId}/followers`, {params}),
  getFollowing: (userId, params) =>
    apiClient.get(`/follows/${userId}/following`, {params}),
  getMutualFollows: (userId, params) =>
    apiClient.get(`/follows/${userId}/mutual`, {params}),
  getFollowStatus: userId => apiClient.get(`/follows/${userId}/status`),
  getSuggestions: params => apiClient.get('/follows/suggestions', {params}),
  removeFollower: (userId, followerId) =>
    apiClient.delete(`/follows/${userId}/followers/${followerId}`),
};

// ========== MESSAGES ENDPOINTS ==========
export const messagesAPI = {
  sendMessage: data => apiClient.post('/messages', data),
  getConversations: params => apiClient.get('/messages/conversations', {params}),
  getConversation: (userId, params) =>
    apiClient.get(`/messages/conversations/${userId}`, {params}),
  searchMessages: (userId, params) =>
    apiClient.get(`/messages/search/${userId}`, {params}),
  deleteMessage: messageId => apiClient.delete(`/messages/${messageId}`),

  // Read Receipts
  markMessageRead: messageId =>
    apiClient.post(`/messages/${messageId}/read`),
  markConversationRead: userId =>
    apiClient.post(`/messages/${userId}/read`),
  getUnreadCount: () => apiClient.get('/messages/unread'),
  getUnreadCountByUser: userId =>
    apiClient.get(`/messages/unread/${userId}`),
};

// ========== NOTIFICATIONS ENDPOINTS ==========
export const notificationsAPI = {
  getNotifications: params => apiClient.get('/notifications', {params}),
  getUnreadCount: () => apiClient.get('/notifications/unread/count'),
  markAsRead: notificationId =>
    apiClient.post(`/notifications/${notificationId}/read`),
  markAllAsRead: () => apiClient.post('/notifications/read-all'),
  deleteNotification: notificationId =>
    apiClient.delete(`/notifications/${notificationId}`),
  deleteAllNotifications: () => apiClient.delete('/notifications'),
};

// ========== REACTIONS ENDPOINTS ==========
export const reactionsAPI = {
  addReaction: (postId, data) =>
    apiClient.post(`/posts/${postId}/reactions`, data),
  removeReaction: (postId, emoji) =>
    apiClient.delete(`/posts/${postId}/reactions/${emoji}`),
  getReactions: (postId, params) =>
    apiClient.get(`/posts/${postId}/reactions`, {params}),
};
