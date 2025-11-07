const { verifyToken } = require('../utils/jwt');
const { AppError } = require('./errorHandler');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const db = require('../config/database');  // CRITICAL FIX: Move to top to avoid circular dependency

/**
 * Protect routes - require authentication
 * Middleware to verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      throw new AppError('Not authorized to access this route', 401);
    }

    // Check if token is blacklisted (for logout functionality)
    const isBlacklisted = await cache.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new AppError('Token has been revoked', 401);
    }

    // Verify token
    const decoded = verifyToken(token, 'access');

    // Attach user info to request
    req.user = {
      id: decoded.id,
      username: decoded.username
    };

    // Update last active timestamp (async, don't wait)
    updateLastActive(decoded.id).catch(err => {
      logger.warn('Failed to update last active', { userId: decoded.id, error: err.message });
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      path: req.path
    });

    if (error instanceof AppError) {
      next(error);
    } else if (error.message === 'Token expired') {
      next(new AppError('Token has expired', 401));
    } else if (error.message === 'Invalid token') {
      next(new AppError('Invalid token', 401));
    } else {
      next(new AppError('Not authorized to access this route', 401));
    }
  }
};

/**
 * Optional auth - attach user if token is present, but don't require it
 * Useful for routes that behave differently for authenticated users
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token, 'access');
        req.user = {
          id: decoded.id,
          username: decoded.username
        };
      } catch (error) {
        // Token invalid or expired, just continue without user
        logger.debug('Optional auth: Invalid token', { error: error.message });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Rate limiting by user
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 60000) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      const key = `ratelimit:user:${req.user.id}`;
      const requests = await cache.incr(key);

      // Set expiration on first request
      if (requests === 1) {
        await cache.expire(key, Math.ceil(windowMs / 1000));
      }

      if (requests > maxRequests) {
        throw new AppError('Too many requests, please try again later', 429);
      }

      // Add rate limit headers
      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - requests));

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }

      // HIGH SECURITY FIX: Fail closed - Redis failure = service temporarily unavailable
      // This prevents DDoS when rate limiting infrastructure fails
      logger.error('Rate limiting error - failing closed for security', {
        error: error.message,
        userId: req.user?.id,
        path: req.path
      });

      // Return 503 instead of allowing requests through
      return next(new AppError('Rate limiting service unavailable', 503));
    }
  };
};

/**
 * Update user's last active timestamp
 * @param {string} userId - User ID
 */
const updateLastActive = async (userId) => {
  // CRITICAL FIX: Removed circular dependency - db now imported at top
  try {
    await db.query(
      'UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  } catch (error) {
    // Log but don't throw - this is not critical
    logger.error('Failed to update last_active_at', {
      userId,
      error: error.message
    });
  }
};

/**
 * Blacklist a token (for logout)
 * @param {string} token - Token to blacklist
 * @param {number} expiresIn - Time until token naturally expires (seconds)
 */
const blacklistToken = async (token, expiresIn = 3600) => {
  try {
    await cache.set(`blacklist:${token}`, 'true', expiresIn);
    logger.info('Token blacklisted', { tokenPreview: token.substring(0, 20) });
  } catch (error) {
    logger.error('Failed to blacklist token', { error: error.message });
    throw error;
  }
};

module.exports = {
  protect,
  optionalAuth,
  rateLimitByUser,
  blacklistToken
};
