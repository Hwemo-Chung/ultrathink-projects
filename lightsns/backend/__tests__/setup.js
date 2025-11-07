const db = require('../src/config/database');
const redis = require('../src/config/redis');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';

// Increase timeout for database operations
jest.setTimeout(10000);

// Global setup before all tests
beforeAll(async () => {
  // Wait for database connection
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Clean up after each test
afterEach(async () => {
  // Clear Redis cache
  if (redis.cache.isConnected) {
    await redis.cache.flushAll();
  }
});

// Global teardown after all tests
afterAll(async () => {
  // Close database connection
  if (db.pool) {
    await db.end();
  }

  // Close Redis connection
  if (redis.cache.client) {
    await redis.cache.disconnect();
  }

  // Wait for connections to close
  await new Promise(resolve => setTimeout(resolve, 500));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
