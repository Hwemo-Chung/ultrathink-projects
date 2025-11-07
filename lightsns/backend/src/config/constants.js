/**
 * Application Constants
 * Centralized configuration for magic numbers and common values
 * MEDIUM FIX: Replace hard-coded values throughout the codebase
 */

module.exports = {
  // Cache TTL (Time To Live) in seconds
  CACHE_TTL: {
    USER: 30 * 60,           // 30 minutes
    USER_PROFILE: 15 * 60,   // 15 minutes
    POST: 5 * 60,            // 5 minutes
    FEED: 3 * 60,            // 3 minutes
    CONVERSATION: 3 * 60,    // 3 minutes
    MESSAGES: 3 * 60,        // 3 minutes
    NOTIFICATION_LIST: 1 * 60, // 1 minute
    NOTIFICATION_COUNT: 30,  // 30 seconds
    UNREAD_COUNT: 30,        // 30 seconds
    FOLLOW_LIST: 5 * 60,     // 5 minutes
    SUGGESTIONS: 10 * 60,    // 10 minutes
    SEARCH_RESULTS: 2 * 60,  // 2 minutes
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 60 * 1000,    // 1 minute window
    MAX_REQUESTS_DEFAULT: 100, // 100 requests per minute
    MAX_REQUESTS_AUTH: 5,    // 5 auth requests per minute
    MAX_REQUESTS_HEAVY: 20,  // 20 heavy operations per minute
    MAX_REQUESTS_SEARCH: 30, // 30 search requests per minute
  },

  // Database
  DB: {
    POOL_MAX: 50,            // Maximum connections
    POOL_MIN: 10,            // Minimum connections
    QUERY_TIMEOUT: 5000,     // 5 seconds
    IDLE_TIMEOUT: 30000,     // 30 seconds
    CONNECTION_TIMEOUT: 5000, // 5 seconds
    MAX_USES: 7500,          // Max uses per connection
  },

  // Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 20,       // Default items per page
    MAX_LIMIT: 100,          // Maximum items per page
    MIN_LIMIT: 1,            // Minimum items per page
  },

  // JWT
  JWT: {
    ACCESS_EXPIRES_IN: '1h',     // 1 hour
    REFRESH_EXPIRES_IN: '7d',    // 7 days
    BLACKLIST_EXPIRES_IN: 3600,  // 1 hour in seconds
  },

  // Password
  PASSWORD: {
    MIN_LENGTH: 8,           // Minimum password length
    MAX_LENGTH: 128,         // Maximum password length
    BCRYPT_ROUNDS: 12,       // bcrypt hashing rounds
  },

  // Content Limits
  CONTENT: {
    POST_MAX_LENGTH: 5000,      // 5000 characters
    COMMENT_MAX_LENGTH: 2000,   // 2000 characters
    BIO_MAX_LENGTH: 500,        // 500 characters
    USERNAME_MIN_LENGTH: 3,     // 3 characters
    USERNAME_MAX_LENGTH: 30,    // 30 characters
    DISPLAY_NAME_MAX_LENGTH: 100, // 100 characters
    MESSAGE_MAX_LENGTH: 5000,   // 5000 characters
  },

  // File Upload
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
    MAX_AVATAR_SIZE: 5 * 1024 * 1024,  // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    AVATAR_SIZE: 400,        // 400x400px
    AVATAR_THUMBNAIL_SIZE: 150, // 150x150px
    POST_IMAGE_SIZE: 1080,   // 1080px max dimension
    POST_THUMBNAIL_SIZE: 320, // 320px max dimension
  },

  // Notification
  NOTIFICATION: {
    DUPLICATE_WINDOW: 24 * 60 * 60,  // 24 hours in seconds
    MAX_NOTIFICATIONS_PER_PAGE: 50,
  },

  // Redis Scan
  REDIS: {
    SCAN_COUNT: 100,         // Keys to scan per iteration
  },

  // WebSocket
  WEBSOCKET: {
    PING_INTERVAL: 25000,    // 25 seconds
    PING_TIMEOUT: 5000,      // 5 seconds
    TYPING_TIMEOUT: 5000,    // 5 seconds - how long until "user stopped typing"
  },

  // HTTP Status Codes (for consistency)
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  // Log Levels
  LOG_LEVEL: {
    PRODUCTION: 'warn',
    STAGING: 'info',
    DEVELOPMENT: 'debug',
    TEST: 'error',
  },

  // Security
  SECURITY: {
    CORS_MAX_AGE: 86400,     // 24 hours
    HELMET_HSTS_MAX_AGE: 31536000, // 1 year
  },
};
