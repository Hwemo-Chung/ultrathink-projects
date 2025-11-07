const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * Generate JWT access token
 * @param {Object} payload - User data to include in token
 * @param {string} payload.id - User ID
 * @param {string} payload.username - Username
 * @returns {string} JWT token
 */
const generateAccessToken = (payload) => {
  try {
    const token = jwt.sign(
      {
        id: payload.id,
        username: payload.username,
        type: 'access'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        issuer: 'lightsns-api',
        audience: 'lightsns-client'
      }
    );

    logger.debug('Access token generated', { userId: payload.id });
    return token;
  } catch (error) {
    logger.error('Error generating access token', { error: error.message });
    throw new Error('Token generation failed');
  }
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - User data to include in token
 * @param {string} payload.id - User ID
 * @returns {string} JWT token
 */
const generateRefreshToken = (payload) => {
  try {
    const token = jwt.sign(
      {
        id: payload.id,
        type: 'refresh'
      },
      process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
        issuer: 'lightsns-api',
        audience: 'lightsns-client'
      }
    );

    logger.debug('Refresh token generated', { userId: payload.id });
    return token;
  } catch (error) {
    logger.error('Error generating refresh token', { error: error.message });
    throw new Error('Token generation failed');
  }
};

/**
 * Generate both access and refresh tokens
 * @param {Object} payload - User data
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokens = (payload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {string} type - Token type ('access' or 'refresh')
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token, type = 'access') => {
  try {
    const secret = type === 'refresh'
      ? (process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET)
      : process.env.JWT_SECRET;

    const decoded = jwt.verify(token, secret, {
      issuer: 'lightsns-api',
      audience: 'lightsns-client'
    });

    // Verify token type matches
    if (decoded.type !== type) {
      throw new Error('Invalid token type');
    }

    logger.debug('Token verified', { userId: decoded.id, type });
    return decoded;
  } catch (error) {
    logger.warn('Token verification failed', {
      error: error.message,
      type
    });

    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object} Decoded token
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token', { error: error.message });
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  decodeToken
};
