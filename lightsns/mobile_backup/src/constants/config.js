/**
 * App Configuration Constants
 */

export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  VERSION: process.env.API_VERSION || 'v1',
  TIMEOUT: parseInt(process.env.API_TIMEOUT || '30000', 10),
  WS_URL: process.env.WS_URL || 'ws://localhost:3000',
};

export const IMAGE_CONFIG = {
  MAX_SIZE: parseInt(process.env.MAX_IMAGE_UPLOAD_SIZE || '10485760', 10),
  QUALITY: parseFloat(process.env.IMAGE_QUALITY || '0.8'),
  THUMBNAIL_SIZE: parseInt(process.env.THUMBNAIL_SIZE || '200', 10),
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

export const CACHE_CONFIG = {
  EXPIRY_HOURS: parseInt(process.env.CACHE_EXPIRY_HOURS || '24', 10),
  MAX_SIZE_MB: parseInt(process.env.MAX_CACHE_SIZE_MB || '100', 10),
};

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  FEED_LIMIT: 10,
  COMMENTS_LIMIT: 20,
  MESSAGES_LIMIT: 50,
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@lightsns:auth_token',
  REFRESH_TOKEN: '@lightsns:refresh_token',
  USER_DATA: '@lightsns:user_data',
  OFFLINE_QUEUE: '@lightsns:offline_queue',
};
