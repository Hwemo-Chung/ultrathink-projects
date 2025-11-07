const redis = require('redis');
const logger = require('../utils/logger');

// Create Redis client
const client = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: 0
});

// Error handling
client.on('error', (err) => {
  logger.error('Redis Client Error', { error: err.message });
});

client.on('connect', () => {
  logger.info('Redis client connected');
});

client.on('ready', () => {
  logger.info('Redis client ready');
});

// Connect to Redis
(async () => {
  try {
    await client.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message });
  }
})();

// Cache helper functions
const cache = {
  // Get value from cache
  get: async (key) => {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis GET error', { key, error: error.message });
      return null;
    }
  },

  // Set value in cache with optional TTL (in seconds)
  set: async (key, value, ttl = 300) => {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await client.setEx(key, ttl, stringValue);
      } else {
        await client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error', { key, error: error.message });
      return false;
    }
  },

  // Delete value from cache
  del: async (key) => {
    try {
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error', { key, error: error.message });
      return false;
    }
  },

  // Delete multiple keys matching a pattern
  // Uses SCAN instead of KEYS to avoid blocking Redis (CRITICAL FIX)
  delPattern: async (pattern) => {
    try {
      let cursor = 0;
      let deletedCount = 0;

      do {
        // SCAN is non-blocking and iterates in chunks
        const result = await client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100  // Process 100 keys per iteration
        });

        cursor = result.cursor;

        if (result.keys && result.keys.length > 0) {
          await client.del(result.keys);
          deletedCount += result.keys.length;
          logger.debug('Deleted keys batch', {
            pattern,
            count: result.keys.length,
            totalDeleted: deletedCount
          });
        }
      } while (cursor !== 0);

      logger.debug('Pattern deletion complete', { pattern, deletedCount });
      return deletedCount;
    } catch (error) {
      logger.error('Redis DEL pattern error', { pattern, error: error.message });
      return 0;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error', { key, error: error.message });
      return false;
    }
  },

  // Increment counter
  incr: async (key) => {
    try {
      return await client.incr(key);
    } catch (error) {
      logger.error('Redis INCR error', { key, error: error.message });
      return null;
    }
  },

  // Set expiration on key
  expire: async (key, ttl) => {
    try {
      await client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Redis EXPIRE error', { key, ttl, error: error.message });
      return false;
    }
  }
};

module.exports = {
  client,
  cache
};
