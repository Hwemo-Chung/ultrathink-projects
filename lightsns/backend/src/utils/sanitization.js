const logger = require('../utils/logger');

/**
 * Input Sanitization Utilities
 * Protects against XSS, SQL Injection, and malicious input
 */

/**
 * Sanitize HTML content - removes all HTML tags
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

  // Remove any remaining HTML entities
  sanitized = sanitized.replace(/&[a-z]+;/gi, '');

  return sanitized.trim();
};

/**
 * Sanitize text content - allows basic formatting
 * @param {string} input - Input string
 * @returns {string} Sanitized string
 */
const sanitizeText = (input) => {
  if (typeof input !== 'string') return input;

  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove on* event handlers
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  return sanitized.trim();
};

/**
 * Sanitize URL - validates and cleans URLs
 * @param {string} url - URL string
 * @returns {string|null} Sanitized URL or null if invalid
 */
const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      logger.warn('Invalid URL protocol', { url, protocol: parsed.protocol });
      return null;
    }

    // Remove common XSS patterns
    const cleanUrl = url.replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '');

    return cleanUrl;
  } catch (error) {
    logger.warn('Invalid URL format', { url, error: error.message });
    return null;
  }
};

/**
 * Validate and sanitize email
 * @param {string} email - Email string
 * @returns {string|null} Sanitized email or null if invalid
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const cleaned = email.trim().toLowerCase();

  if (!emailRegex.test(cleaned)) {
    return null;
  }

  return cleaned;
};

/**
 * Sanitize username - alphanumeric and underscore only
 * @param {string} username - Username string
 * @returns {string|null} Sanitized username or null if invalid
 */
const sanitizeUsername = (username) => {
  if (!username || typeof username !== 'string') return null;

  // Only allow alphanumeric, underscore, and dash
  const cleaned = username.trim().toLowerCase();
  const usernameRegex = /^[a-z0-9_-]+$/;

  if (!usernameRegex.test(cleaned)) {
    return null;
  }

  return cleaned;
};

/**
 * Recursively sanitize an object's string values
 * @param {Object} obj - Object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj, options = {}) => {
  const {
    allowHtml = false,
    fields = null // Array of field names to sanitize, null = all
  } = options;

  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip if fields specified and this field not in list
    if (fields && !fields.includes(key)) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'string') {
      // Apply appropriate sanitization
      if (key.toLowerCase().includes('email')) {
        sanitized[key] = sanitizeEmail(value) || value;
      } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
        sanitized[key] = sanitizeUrl(value) || value;
      } else if (key.toLowerCase().includes('username')) {
        sanitized[key] = sanitizeUsername(value) || value;
      } else {
        sanitized[key] = allowHtml ? sanitizeText(value) : sanitizeHtml(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Middleware to sanitize request body
 * @param {Object} options - Sanitization options
 */
const sanitizeBody = (options = {}) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      try {
        req.body = sanitizeObject(req.body, options);
        logger.debug('Request body sanitized', { path: req.path });
      } catch (error) {
        logger.error('Error sanitizing request body', { error: error.message });
      }
    }
    next();
  };
};

/**
 * Middleware to sanitize query parameters
 */
const sanitizeQuery = () => {
  return (req, res, next) => {
    if (req.query && typeof req.query === 'object') {
      try {
        req.query = sanitizeObject(req.query, { allowHtml: false });
        logger.debug('Query parameters sanitized', { path: req.path });
      } catch (error) {
        logger.error('Error sanitizing query parameters', { error: error.message });
      }
    }
    next();
  };
};

/**
 * Prevent common SQL injection patterns
 * @param {string} input - Input string
 * @returns {boolean} True if input contains suspicious patterns
 */
const hasSqlInjection = (input) => {
  if (typeof input !== 'string') return false;

  const sqlPatterns = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Middleware to detect SQL injection attempts
 */
const detectSqlInjection = () => {
  return (req, res, next) => {
    const checkObject = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === 'string' && hasSqlInjection(value)) {
          logger.warn('Potential SQL injection attempt detected', {
            path: req.path,
            field: currentPath,
            value: value.substring(0, 100),
            ip: req.ip
          });

          return res.status(400).json({
            status: 'fail',
            message: 'Invalid input detected'
          });
        } else if (typeof value === 'object' && value !== null) {
          const result = checkObject(value, currentPath);
          if (result) return result;
        }
      }
    };

    if (req.body) checkObject(req.body);
    if (req.query) checkObject(req.query);
    if (req.params) checkObject(req.params);

    next();
  };
};

module.exports = {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeEmail,
  sanitizeUsername,
  sanitizeObject,
  sanitizeBody,
  sanitizeQuery,
  hasSqlInjection,
  detectSqlInjection
};
