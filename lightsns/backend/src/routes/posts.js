const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const postController = require('../controllers/postController');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

/**
 * Validation rules
 */
const createPostValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Content must be between 1 and 500 characters'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters'),

  body('hashtags')
    .optional()
    .isArray()
    .withMessage('Hashtags must be an array'),

  body('hashtags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each hashtag must be between 1 and 50 characters')
];

const updatePostValidation = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Content must be between 1 and 500 characters'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location must not exceed 255 characters')
];

const commentValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters'),

  body('parent_id')
    .optional()
    .isUUID()
    .withMessage('Invalid parent comment ID')
];

/**
 * Routes
 */

// @route   POST /api/v1/posts
// @desc    Create a new post
// @access  Private
router.post(
  '/',
  protect,
  uploadSingle('image'),
  createPostValidation,
  postController.createPost
);

// @route   GET /api/v1/posts/feed
// @desc    Get user's feed
// @access  Private
router.get('/feed', protect, postController.getFeed);

// @route   GET /api/v1/posts/hashtag/:hashtag
// @desc    Search posts by hashtag
// @access  Public
router.get('/hashtag/:hashtag', optionalAuth, postController.searchByHashtag);

// @route   GET /api/v1/posts/user/:userId
// @desc    Get posts by user
// @access  Public
router.get('/user/:userId', optionalAuth, postController.getUserPosts);

// @route   GET /api/v1/posts/:id
// @desc    Get a single post
// @access  Public
router.get('/:id', optionalAuth, postController.getPost);

// @route   PATCH /api/v1/posts/:id
// @desc    Update a post
// @access  Private
router.patch('/:id', protect, updatePostValidation, postController.updatePost);

// @route   DELETE /api/v1/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', protect, postController.deletePost);

// @route   POST /api/v1/posts/:id/like
// @desc    Like a post
// @access  Private
router.post('/:id/like', protect, postController.likePost);

// @route   DELETE /api/v1/posts/:id/like
// @desc    Unlike a post
// @access  Private
router.delete('/:id/like', protect, postController.unlikePost);

// @route   GET /api/v1/posts/:id/likes
// @desc    Get users who liked a post
// @access  Public
router.get('/:id/likes', postController.getLikers);

// @route   POST /api/v1/posts/:id/comments
// @desc    Add a comment to a post
// @access  Private
router.post('/:id/comments', protect, commentValidation, postController.addComment);

// @route   GET /api/v1/posts/:id/comments
// @desc    Get comments for a post
// @access  Public
router.get('/:id/comments', postController.getComments);

// @route   GET /api/v1/posts/comments/:commentId/replies
// @desc    Get replies to a comment
// @access  Public
router.get('/comments/:commentId/replies', postController.getCommentReplies);

// @route   DELETE /api/v1/posts/comments/:commentId
// @desc    Delete a comment
// @access  Private
router.delete('/comments/:commentId', protect, postController.deleteComment);

module.exports = router;
