const User = require('../models/User');
const { hashPassword, comparePassword, validatePassword } = require('../utils/password');
const { generateTokens, verifyToken } = require('../utils/jwt');
const { blacklistToken } = require('../middleware/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { cache } = require('../config/redis');

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const { username, display_name, email, phone_number, password } = req.body;

  // Validate password strength
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new AppError('Password validation failed', 400, passwordValidation.errors);
  }

  // Check if user already exists
  const existingUser = await User.findByUsername(username);
  if (existingUser) {
    throw new AppError('Username already taken', 409);
  }

  if (email) {
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      throw new AppError('Email already registered', 409);
    }
  }

  if (phone_number) {
    const existingPhone = await User.findByPhoneNumber(phone_number);
    if (existingPhone) {
      throw new AppError('Phone number already registered', 409);
    }
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Create user
  const user = await User.create({
    username,
    display_name,
    email,
    phone_number,
    password_hash
  });

  // Generate tokens
  const tokens = generateTokens({
    id: user.id,
    username: user.username
  });

  // Cache user data
  await cache.set(`user:${user.id}`, user, 1800); // 30 minutes

  logger.info('User registered successfully', {
    userId: user.id,
    username: user.username
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      ...tokens
    }
  });
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const { identifier, password } = req.body;

  // Find user by username, email, or phone
  let user;
  if (identifier.includes('@')) {
    user = await User.findByEmail(identifier, true);
  } else if (identifier.match(/^[+]?[0-9]{10,15}$/)) {
    user = await User.findByPhoneNumber(identifier, true);
  } else {
    user = await User.findByUsername(identifier, true);
  }

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Remove password from user object
  delete user.password_hash;

  // Generate tokens
  const tokens = generateTokens({
    id: user.id,
    username: user.username
  });

  // Cache user data
  await cache.set(`user:${user.id}`, user, 1800);

  logger.info('User logged in', {
    userId: user.id,
    username: user.username
  });

  res.json({
    success: true,
    message: 'Logged in successfully',
    data: {
      user,
      ...tokens
    }
  });
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token required', 400);
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyToken(refreshToken, 'refresh');
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Check if token is blacklisted
  const isBlacklisted = await cache.exists(`blacklist:${refreshToken}`);
  if (isBlacklisted) {
    throw new AppError('Refresh token has been revoked', 401);
  }

  // Get user
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Generate new tokens
  const tokens = generateTokens({
    id: user.id,
    username: user.username
  });

  // Optionally blacklist old refresh token (token rotation)
  // await blacklistToken(refreshToken, 30 * 24 * 60 * 60); // 30 days

  logger.info('Token refreshed', { userId: user.id });

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: tokens
  });
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    // Blacklist the token
    await blacklistToken(token, 3600); // 1 hour (or token expiry time)

    // Clear user cache
    if (req.user) {
      await cache.del(`user:${req.user.id}`);
    }

    logger.info('User logged out', { userId: req.user?.id });
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  // Try to get from cache first
  let user = await cache.get(`user:${req.user.id}`);

  if (!user) {
    // Get from database with stats
    user = await User.findByIdWithStats(req.user.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Cache for 30 minutes
    await cache.set(`user:${req.user.id}`, user, 1800);
  }

  res.json({
    success: true,
    data: { user }
  });
});

/**
 * @route   PATCH /api/v1/auth/me
 * @desc    Update current user
 * @access  Private
 */
exports.updateMe = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Validation failed', 400, errors.array());
  }

  const updates = {};
  const allowedFields = ['display_name', 'bio'];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  const user = await User.update(req.user.id, updates);

  // Invalidate cache
  await cache.del(`user:${req.user.id}`);

  logger.info('User updated', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
});

/**
 * @route   POST /api/v1/auth/me/avatar
 * @desc    Upload profile avatar
 * @access  Private
 */
exports.uploadAvatar = asyncHandler(async (req, res) => {
  const { processProfileImage } = require('../utils/imageProcessor');

  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }

  logger.info('Processing avatar upload', {
    userId: req.user.id,
    filename: req.file.filename,
    size: req.file.size
  });

  // Process the image
  const result = await processProfileImage(
    req.file.path,
    'uploads/profiles',
    `user-${req.user.id}`
  );

  // Get current user to check for old avatar
  const currentUser = await User.findById(req.user.id);

  // Delete old avatar if exists
  if (currentUser.avatar_url) {
    const { deleteImage } = require('../utils/imageProcessor');
    try {
      await deleteImage(currentUser.avatar_url);
    } catch (error) {
      logger.warn('Failed to delete old avatar', {
        error: error.message,
        oldUrl: currentUser.avatar_url
      });
      // Continue anyway
    }
  }

  // Update user with new avatar URLs
  const user = await User.update(req.user.id, {
    avatar_url: result.url,
    avatar_thumbnail_url: result.thumbnailUrl
  });

  // Invalidate cache
  await cache.del(`user:${req.user.id}`);

  logger.info('Avatar uploaded successfully', {
    userId: req.user.id,
    url: result.url,
    size: result.metadata.size
  });

  res.json({
    success: true,
    message: 'Avatar uploaded successfully',
    data: {
      user,
      imageMetadata: result.metadata
    }
  });
});

/**
 * @route   DELETE /api/v1/auth/me/avatar
 * @desc    Delete profile avatar
 * @access  Private
 */
exports.deleteAvatar = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user.id);

  if (!currentUser.avatar_url) {
    throw new AppError('No avatar to delete', 404);
  }

  // Delete the image file
  const { deleteImage } = require('../utils/imageProcessor');
  try {
    await deleteImage(currentUser.avatar_url);
  } catch (error) {
    logger.error('Failed to delete avatar file', {
      error: error.message,
      url: currentUser.avatar_url
    });
    // Continue to update database anyway
  }

  // Update user to remove avatar URLs
  const user = await User.update(req.user.id, {
    avatar_url: null,
    avatar_thumbnail_url: null
  });

  // Invalidate cache
  await cache.del(`user:${req.user.id}`);

  logger.info('Avatar deleted', { userId: req.user.id });

  res.json({
    success: true,
    message: 'Avatar deleted successfully',
    data: { user }
  });
});
