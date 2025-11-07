const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Basic health check - fast response for load balancers
 * @route GET /health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Detailed health check - includes dependency status
 * @route GET /health/detailed
 */
router.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {}
  };

  // Check database connection
  try {
    const start = Date.now();
    await db.query('SELECT 1');
    const duration = Date.now() - start;

    health.checks.database = {
      status: 'healthy',
      responseTime: `${duration}ms`,
      connection: 'active'
    };
  } catch (error) {
    health.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
    logger.error('Health check: Database unhealthy', { error: error.message });
  }

  // Check Redis connection
  try {
    const start = Date.now();
    await cache.set('health:check', 'ok', 10);
    const value = await cache.get('health:check');
    const duration = Date.now() - start;

    health.checks.redis = {
      status: value === 'ok' ? 'healthy' : 'degraded',
      responseTime: `${duration}ms`,
      connection: 'active'
    };

    if (value !== 'ok') {
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.redis = {
      status: 'unhealthy',
      error: error.message
    };
    health.status = 'degraded';
    logger.error('Health check: Redis unhealthy', { error: error.message });
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  health.memory = {
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
  };

  // CPU usage (simplified)
  const cpuUsage = process.cpuUsage();
  health.cpu = {
    user: `${Math.round(cpuUsage.user / 1000)}ms`,
    system: `${Math.round(cpuUsage.system / 1000)}ms`
  };

  // Determine HTTP status code
  const statusCode = health.status === 'healthy' ? 200 : 503;

  res.status(statusCode).json(health);
});

/**
 * Readiness check - are we ready to serve traffic?
 * @route GET /health/ready
 */
router.get('/health/ready', async (req, res) => {
  try {
    // Check critical dependencies
    await db.query('SELECT 1');
    await cache.set('health:ready', 'ok', 5);

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness check - is the application alive?
 * @route GET /health/live
 */
router.get('/health/live', (req, res) => {
  // Simple check - if we can respond, we're alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
