/**
 * Posts Slice
 */

import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  feed: [],
  userPosts: {},
  currentPost: null,
  loading: false,
  refreshing: false,
  hasMore: true,
  cursor: null,
  error: null,
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setFeed: (state, action) => {
      state.feed = action.payload.posts;
      state.cursor = action.payload.cursor;
      state.hasMore = action.payload.hasMore;
    },
    appendToFeed: (state, action) => {
      state.feed = [...state.feed, ...action.payload.posts];
      state.cursor = action.payload.cursor;
      state.hasMore = action.payload.hasMore;
    },
    prependToFeed: (state, action) => {
      state.feed = [action.payload, ...state.feed];
    },
    updatePostInFeed: (state, action) => {
      const index = state.feed.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.feed[index] = {...state.feed[index], ...action.payload};
      }
    },
    removePostFromFeed: (state, action) => {
      state.feed = state.feed.filter(p => p.id !== action.payload);
    },
    setCurrentPost: (state, action) => {
      state.currentPost = action.payload;
    },
    setUserPosts: (state, action) => {
      const {userId, posts} = action.payload;
      state.userPosts[userId] = posts;
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
    incrementLikes: (state, action) => {
      const postId = action.payload;
      const feedPost = state.feed.find(p => p.id === postId);
      if (feedPost) {
        feedPost.likes_count = (feedPost.likes_count || 0) + 1;
        feedPost.is_liked = true;
      }
      if (state.currentPost?.id === postId) {
        state.currentPost.likes_count = (state.currentPost.likes_count || 0) + 1;
        state.currentPost.is_liked = true;
      }
    },
    decrementLikes: (state, action) => {
      const postId = action.payload;
      const feedPost = state.feed.find(p => p.id === postId);
      if (feedPost) {
        feedPost.likes_count = Math.max((feedPost.likes_count || 0) - 1, 0);
        feedPost.is_liked = false;
      }
      if (state.currentPost?.id === postId) {
        state.currentPost.likes_count = Math.max(
          (state.currentPost.likes_count || 0) - 1,
          0,
        );
        state.currentPost.is_liked = false;
      }
    },
  },
});

export const {
  setFeed,
  appendToFeed,
  prependToFeed,
  updatePostInFeed,
  removePostFromFeed,
  setCurrentPost,
  setUserPosts,
  setLoading,
  setRefreshing,
  setError,
  clearError,
  incrementLikes,
  decrementLikes,
} = postsSlice.actions;

export default postsSlice.reducer;

// Selectors
export const selectFeed = state => state.posts.feed;
export const selectCurrentPost = state => state.posts.currentPost;
export const selectPostsLoading = state => state.posts.loading;
export const selectPostsRefreshing = state => state.posts.refreshing;
export const selectHasMore = state => state.posts.hasMore;
export const selectCursor = state => state.posts.cursor;
