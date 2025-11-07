const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, optionalAuth } = require('../middleware/auth');
const reactionController = require('../controllers/reactionController');
const { VALID_EMOJIS } = require('../models/Reaction');

/**
 * @route   POST /api/v1/posts/:id/react
 * @desc    Add or update emoji reaction
 * @access  Private
 */
router.post(
  '/:id/react',
  protect,
  [
    body('emoji')
      .notEmpty()
      .withMessage('Emoji is required')
      .isIn(VALID_EMOJIS)
      .withMessage(`Emoji must be one of: ${VALID_EMOJIS.join(' ')}`)
  ],
  reactionController.addReaction
);

/**
 * @route   DELETE /api/v1/posts/:id/react
 * @desc    Remove emoji reaction
 * @access  Private
 */
router.delete('/:id/react', protect, reactionController.removeReaction);

/**
 * @route   GET /api/v1/posts/:id/reactions
 * @desc    Get users who reacted to a post
 * @access  Public
 */
router.get('/:id/reactions', optionalAuth, reactionController.getReactions);

/**
 * @route   GET /api/v1/posts/:id/reactions/counts
 * @desc    Get reaction counts for a post
 * @access  Public
 */
router.get(
  '/:id/reactions/counts',
  optionalAuth,
  reactionController.getReactionCounts
);

module.exports = router;
