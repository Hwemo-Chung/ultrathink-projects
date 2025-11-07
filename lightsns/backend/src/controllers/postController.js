const Post = require('../models/Post');
const Like = require('../models/Like');
const Comment = require('../models/Comment');
const { Reaction } = require('../models/Reaction');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');

/**
 * @route   POST /api/v1/posts
 * @desc    Create a new post
 * @access  Private
 */
exports.createPost = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const { content, location, hashtags } = req.body;

  // Process image if uploaded
  let imageData = {};
  if (req.file) {
    const { processPostImage } = require('../utils/imageProcessor');

    const result = await processPostImage(
      req.file.path,
      'uploads/posts',
      `post-${Date.now()}`
    );

    imageData = {
      image_url: result.url,
      image_thumbnail_url: result.thumbnailUrl,
      image_metadata: result.metadata
    };
  }

  // Extract hashtags from content if not provided
  const finalHashtags = hashtags || extractHashtags(content);

  const post = await Post.create({
    user_id: req.user.id,
    content,
    location,
    hashtags: finalHashtags,
    ...imageData
  });

  // Invalidate user's posts cache
  await cache.delPattern(`posts:user:${req.user.id}:*`);
  await cache.delPattern(`feed:*`); // Invalidate all feeds

  logger.info('Post created', { postId: post.id, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: 'Post created successfully',
    data: { post }
  });
});

/**
 * @route   GET /api/v1/posts/:id
 * @desc    Get a single post
 * @access  Public
 */
exports.getPost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try cache first
  const cacheKey = `post:${id}`;
  let post = await cache.get(cacheKey);

  if (!post) {
    post = await Post.findById(id);

    if (!post) {
      throw new AppError('Post not found', 404);
    }

    // Cache for 5 minutes
    await cache.set(cacheKey, post, 300);
  }

  // Check if current user liked this post
  if (req.user) {
    post.is_liked = await Like.isLiked(req.user.id, id);
  }

  // Get reaction data
  const reactions = await Reaction.getReactionCounts(id);
  post.reactions = reactions;

  // Get user's reaction if authenticated
  if (req.user) {
    const userReaction = await Reaction.getUserReaction(id, req.user.id);
    post.user_reaction = userReaction ? userReaction.emoji : null;
  }

  res.json({
    success: true,
    data: { post }
  });
});

/**
 * @route   GET /api/v1/posts/user/:userId
 * @desc    Get posts by user
 * @access  Public
 */
exports.getUserPosts = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, cursor } = req.query;

  const cacheKey = `posts:user:${userId}:${limit}:${cursor || 'initial'}`;
  let posts = await cache.get(cacheKey);

  if (!posts) {
    posts = await Post.findByUserId(userId, parseInt(limit), cursor);
    await cache.set(cacheKey, posts, 300); // 5 minutes
  }

  // Get reactions for all posts (batch operation)
  if (posts.length > 0) {
    const postIds = posts.map(p => p.id);
    const reactionsMap = await Reaction.getReactionsForPosts(
      postIds,
      req.user ? req.user.id : null
    );

    // Attach reactions to each post
    posts.forEach(post => {
      const reactionData = reactionsMap[post.id];
      post.reactions = reactionData ? reactionData.counts : {};
      post.user_reaction = reactionData ? reactionData.user_reaction : null;
    });
  }

  res.json({
    success: true,
    data: {
      posts,
      hasMore: posts.length === parseInt(limit),
      nextCursor: posts.length > 0 ? posts[posts.length - 1].id : null
    }
  });
});

/**
 * @route   GET /api/v1/posts/feed
 * @desc    Get user's feed (posts from followed users)
 * @access  Private
 */
exports.getFeed = asyncHandler(async (req, res) => {
  const { limit = 20, cursor } = req.query;

  const cacheKey = `feed:${req.user.id}:${limit}:${cursor || 'initial'}`;
  let posts = await cache.get(cacheKey);

  if (!posts) {
    posts = await Post.getFeed(req.user.id, parseInt(limit), cursor);
    await cache.set(cacheKey, posts, 180); // 3 minutes (shorter for feed)
  }

  // Get reactions for all posts (batch operation)
  if (posts.length > 0) {
    const postIds = posts.map(p => p.id);
    const reactionsMap = await Reaction.getReactionsForPosts(postIds, req.user.id);

    // Attach reactions to each post
    posts.forEach(post => {
      const reactionData = reactionsMap[post.id];
      post.reactions = reactionData ? reactionData.counts : {};
      post.user_reaction = reactionData ? reactionData.user_reaction : null;
    });
  }

  res.json({
    success: true,
    data: {
      posts,
      hasMore: posts.length === parseInt(limit),
      nextCursor: posts.length > 0 ? posts[posts.length - 1].id : null
    }
  });
});

/**
 * @route   PATCH /api/v1/posts/:id
 * @desc    Update a post
 * @access  Private
 */
exports.updatePost = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const { id } = req.params;
  const updates = {};

  if (req.body.content !== undefined) updates.content = req.body.content;
  if (req.body.location !== undefined) updates.location = req.body.location;

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  const post = await Post.update(id, req.user.id, updates);

  // Invalidate caches
  await cache.del(`post:${id}`);
  await cache.delPattern(`posts:user:${req.user.id}:*`);
  await cache.delPattern(`feed:*`);

  logger.info('Post updated', { postId: id, userId: req.user.id });

  res.json({
    success: true,
    message: 'Post updated successfully',
    data: { post }
  });
});

/**
 * @route   DELETE /api/v1/posts/:id
 * @desc    Delete a post
 * @access  Private
 */
exports.deletePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Get post to check for images
  const post = await Post.findById(id);
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  if (post.user_id !== req.user.id) {
    throw new AppError('Not authorized to delete this post', 403);
  }

  // Delete the post
  await Post.delete(id, req.user.id);

  // Delete images if they exist
  if (post.image_url) {
    const { deleteImage } = require('../utils/imageProcessor');
    try {
      await deleteImage(post.image_url);
    } catch (error) {
      logger.warn('Failed to delete post image', {
        error: error.message,
        imageUrl: post.image_url
      });
    }
  }

  // Invalidate caches
  await cache.del(`post:${id}`);
  await cache.delPattern(`posts:user:${req.user.id}:*`);
  await cache.delPattern(`feed:*`);

  logger.info('Post deleted', { postId: id, userId: req.user.id });

  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
});

/**
 * @route   POST /api/v1/posts/:id/like
 * @desc    Like a post
 * @access  Private
 */
exports.likePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if post exists
  const post = await Post.findById(id);
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  const like = await Like.create(req.user.id, id);

  if (!like) {
    // Already liked
    return res.json({
      success: true,
      message: 'Post already liked'
    });
  }

  // Send notification to post owner
  await notificationService.sendLikeNotification(post.user_id, req.user.id, id);

  // Invalidate caches
  await cache.del(`post:${id}`);

  logger.info('Post liked', { postId: id, userId: req.user.id });

  res.json({
    success: true,
    message: 'Post liked successfully',
    data: { like }
  });
});

/**
 * @route   DELETE /api/v1/posts/:id/like
 * @desc    Unlike a post
 * @access  Private
 */
exports.unlikePost = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const success = await Like.delete(req.user.id, id);

  if (!success) {
    throw new AppError('Like not found', 404);
  }

  // Invalidate caches
  await cache.del(`post:${id}`);

  logger.info('Post unliked', { postId: id, userId: req.user.id });

  res.json({
    success: true,
    message: 'Post unliked successfully'
  });
});

/**
 * @route   GET /api/v1/posts/:id/likes
 * @desc    Get users who liked a post
 * @access  Public
 */
exports.getLikers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const likers = await Like.getLikers(id, parseInt(limit), parseInt(offset));

  res.json({
    success: true,
    data: {
      likers,
      hasMore: likers.length === parseInt(limit)
    }
  });
});

/**
 * @route   POST /api/v1/posts/:id/comments
 * @desc    Add a comment to a post
 * @access  Private
 */
exports.addComment = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const { id } = req.params;
  const { content, parent_id } = req.body;

  // Check if post exists
  const post = await Post.findById(id);
  if (!post) {
    throw new AppError('Post not found', 404);
  }

  let parentComment = null;
  // If replying, check if parent comment exists
  if (parent_id) {
    parentComment = await Comment.findById(parent_id);
    if (!parentComment) {
      throw new AppError('Parent comment not found', 404);
    }
    if (parentComment.post_id !== id) {
      throw new AppError('Parent comment does not belong to this post', 400);
    }
  }

  const comment = await Comment.create({
    user_id: req.user.id,
    post_id: id,
    content,
    parent_id
  });

  // Get comment with user info
  const fullComment = await Comment.findById(comment.id);

  // Send notifications
  if (parent_id && parentComment) {
    // This is a reply - notify the parent comment owner
    await notificationService.sendReplyNotification(
      parentComment.user_id,
      req.user.id,
      id,
      comment.id
    );
  } else {
    // This is a top-level comment - notify the post owner
    await notificationService.sendCommentNotification(
      post.user_id,
      req.user.id,
      id,
      comment.id
    );
  }

  // Invalidate caches
  await cache.del(`post:${id}`);

  logger.info('Comment added', { commentId: comment.id, postId: id, userId: req.user.id });

  res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: { comment: fullComment }
  });
});

/**
 * @route   GET /api/v1/posts/:id/comments
 * @desc    Get comments for a post
 * @access  Public
 */
exports.getComments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const comments = await Comment.findByPostId(id, parseInt(limit), parseInt(offset));

  res.json({
    success: true,
    data: {
      comments,
      hasMore: comments.length === parseInt(limit)
    }
  });
});

/**
 * @route   GET /api/v1/posts/comments/:commentId/replies
 * @desc    Get replies to a comment
 * @access  Public
 */
exports.getCommentReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  const replies = await Comment.findReplies(commentId, parseInt(limit), parseInt(offset));

  res.json({
    success: true,
    data: {
      replies,
      hasMore: replies.length === parseInt(limit)
    }
  });
});

/**
 * @route   DELETE /api/v1/posts/comments/:commentId
 * @desc    Delete a comment
 * @access  Private
 */
exports.deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  await Comment.delete(commentId, req.user.id);

  // Invalidate caches
  await cache.del(`post:${comment.post_id}`);

  logger.info('Comment deleted', { commentId, userId: req.user.id });

  res.json({
    success: true,
    message: 'Comment deleted successfully'
  });
});

/**
 * @route   GET /api/v1/posts/hashtag/:hashtag
 * @desc    Search posts by hashtag
 * @access  Public
 */
exports.searchByHashtag = asyncHandler(async (req, res) => {
  const { hashtag } = req.params;
  const { limit = 20, cursor } = req.query;

  // Remove # if present
  const cleanHashtag = hashtag.replace(/^#/, '');

  const cacheKey = `posts:hashtag:${cleanHashtag}:${limit}:${cursor || 'initial'}`;
  let posts = await cache.get(cacheKey);

  if (!posts) {
    posts = await Post.searchByHashtag(cleanHashtag, parseInt(limit), cursor);
    await cache.set(cacheKey, posts, 300); // 5 minutes
  }

  // Get reactions for all posts (batch operation)
  if (posts.length > 0) {
    const postIds = posts.map(p => p.id);
    const reactionsMap = await Reaction.getReactionsForPosts(
      postIds,
      req.user ? req.user.id : null
    );

    // Attach reactions to each post
    posts.forEach(post => {
      const reactionData = reactionsMap[post.id];
      post.reactions = reactionData ? reactionData.counts : {};
      post.user_reaction = reactionData ? reactionData.user_reaction : null;
    });
  }

  res.json({
    success: true,
    data: {
      hashtag: cleanHashtag,
      posts,
      hasMore: posts.length === parseInt(limit),
      nextCursor: posts.length > 0 ? posts[posts.length - 1].id : null
    }
  });
});

/**
 * Helper function to extract hashtags from content
 * @param {string} content - Post content
 * @returns {Array<string>} Array of hashtags
 */
function extractHashtags(content) {
  if (!content) return [];

  const hashtagRegex = /#(\w+)/g;
  const matches = content.match(hashtagRegex);

  if (!matches) return [];

  // Remove # and convert to lowercase, remove duplicates
  return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
}

module.exports = exports;
