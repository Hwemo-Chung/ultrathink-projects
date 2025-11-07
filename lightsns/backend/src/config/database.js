const { Pool } = require('pg');
const logger = require('../utils/logger');

// PostgreSQL connection pool
// HIGH PERFORMANCE FIX: Increased pool size and improved timeouts
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'lightsns_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_MAX) || 50, // Increased from 20 to 50
  min: parseInt(process.env.DB_POOL_MIN) || 10, // Maintain 10 idle connections
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 5000, // Increased from 2s to 5s
  maxUses: 7500, // Close and replace connection after 7500 uses
  allowExitOnIdle: true, // Allow process to exit if all clients are idle
});

// Test the connection
pool.on('connect', () => {
  logger.info('Database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
  process.exit(-1);
});

// Helper function to execute queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error', { error: error.message, text });
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  try {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);

    // Set a timeout of 5 seconds, after which we will log a warning
    const timeout = setTimeout(() => {
      logger.warn('A client has been checked out for more than 5 seconds!');
    }, 5000);

    // Monkey patch the release method to clear the timeout
    client.release = () => {
      clearTimeout(timeout);
      client.release = release;
      return release();
    };

    return client;
  } catch (error) {
    logger.error('Error getting database client', { error: error.message });
    throw error;
  }
};

/**
 * Execute a function within a database transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 *
 * @param {Function} callback - Async function that receives a client
 * @returns {Promise<any>} Result from the callback
 *
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO users ...');
 *   await client.query('INSERT INTO profiles ...');
 *   return { success: true };
 * });
 */
const withTransaction = async (callback) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    logger.debug('Transaction started');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('Transaction committed');

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.warn('Transaction rolled back', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Execute multiple queries in a transaction
 * Simple helper for common transaction patterns
 *
 * @param {Array<{text: string, params: Array}>} queries - Array of query objects
 * @returns {Promise<Array>} Results from all queries
 *
 * @example
 * const results = await transaction([
 *   { text: 'UPDATE users SET ...', params: [userId] },
 *   { text: 'INSERT INTO audit_log ...', params: [userId, action] }
 * ]);
 */
const transaction = async (queries) => {
  return withTransaction(async (client) => {
    const results = [];

    for (const { text, params } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }

    return results;
  });
};

module.exports = {
  query,
  getClient,
  withTransaction,
  transaction,
  pool
};
