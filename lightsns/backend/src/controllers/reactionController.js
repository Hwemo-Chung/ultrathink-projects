const { Reaction, VALID_EMOJIS } = require('../models/Reaction');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * @route   POST /api/v1/posts/:id/react
 * @desc    Add or update emoji reaction to a post
 * @access  Private
 */
exports.addReaction = asyncHandler(async (req, res) => {
  const { id: postId } = req.params;
  const { emoji } = req.body;
  const userId = req.user.id;

  // Validate emoji
  if (!emoji || !VALID_EMOJIS.includes(emoji)) {
    throw new AppError(
      `Invalid emoji. Must be one of: ${VALID_EMOJIS.join(' ')}`,
      400
    );
  }

  // Add/update reaction
  const reaction = await Reaction.addReaction({
    post_id: postId,
    user_id: userId,
    emoji
  });

  // Invalidate cache
  await cache.del(`post:${postId}`);
  await cache.del(`reactions:${postId}`);

  logger.info('Reaction added', {
    postId,
    userId,
    emoji,
    reactionId: reaction.id
  });

  res.status(200).json({
    success: true,
    message: 'Reaction added successfully',
    data: {
      reaction: {
        id: reaction.id,
        post_id: reaction.post_id,
        emoji: reaction.emoji,
        created_at: reaction.created_at
      }
    }
  });
});

/**
 * @route   DELETE /api/v1/posts/:id/react
 * @desc    Remove emoji reaction from a post
 * @access  Private
 */
exports.removeReaction = asyncHandler(async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;

  const deleted = await Reaction.removeReaction(postId, userId);

  if (!deleted) {
    throw new AppError('No reaction found to remove', 404);
  }

  // Invalidate cache
  await cache.del(`post:${postId}`);
  await cache.del(`reactions:${postId}`);

  logger.info('Reaction removed', { postId, userId });

  res.status(200).json({
    success: true,
    message: 'Reaction removed successfully'
  });
});

/**
 * @route   GET /api/v1/posts/:id/reactions
 * @desc    Get users who reacted to a post
 * @access  Public
 */
exports.getReactions = asyncHandler(async (req, res) => {
  const { id: postId } = req.params;
  const { emoji, limit = 50 } = req.query;

  // Try cache first
  const cacheKey = `reactions:${postId}:${emoji || 'all'}:${limit}`;
  const cached = await cache.get(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      data: {
        reactions: cached.reactions,
        counts: cached.counts
      },
      cached: true
    });
  }

  // Get users who reacted
  const reactions = await Reaction.getUsersWhoReacted(
    postId,
    emoji,
    parseInt(limit)
  );

  // Get counts
  const counts = await Reaction.getReactionCounts(postId);

  // Cache for 1 minute
  await cache.set(cacheKey, { reactions, counts }, 60);

  res.status(200).json({
    success: true,
    data: {
      reactions,
      counts
    }
  });
});

/**
 * @route   GET /api/v1/posts/:id/reactions/counts
 * @desc    Get reaction counts for a post
 * @access  Public
 */
exports.getReactionCounts = asyncHandler(async (req, res) => {
  const { id: postId } = req.params;

  // Try cache first
  const cacheKey = `reactions:counts:${postId}`;
  const cached = await cache.get(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      data: {
        counts: cached
      },
      cached: true
    });
  }

  // Get counts
  const counts = await Reaction.getReactionCounts(postId);

  // Get user's reaction if authenticated
  let userReaction = null;
  if (req.user) {
    const reaction = await Reaction.getUserReaction(postId, req.user.id);
    userReaction = reaction ? reaction.emoji : null;
  }

  const data = {
    counts,
    user_reaction: userReaction
  };

  // Cache for 30 seconds
  await cache.set(cacheKey, counts, 30);

  res.status(200).json({
    success: true,
    data
  });
});
