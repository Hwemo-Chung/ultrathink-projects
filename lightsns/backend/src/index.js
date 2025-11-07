const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { initializeSocket } = require('./services/socketService');
const { sanitizeBody, sanitizeQuery, detectSqlInjection } = require('./utils/sanitization');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Compression middleware (Brotli/Gzip)
app.use(compression({
  level: 6,
  threshold: 1024 // Only compress responses larger than 1KB
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware (SECURITY IMPROVEMENT)
app.use(detectSqlInjection()); // Detect SQL injection attempts
app.use(sanitizeBody({ allowHtml: false })); // Sanitize request body
app.use(sanitizeQuery()); // Sanitize query parameters

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoints (IMPROVED)
const healthRoutes = require('./routes/health');
app.use('/', healthRoutes);

// API version info
app.get(`/api/${process.env.API_VERSION || 'v1'}`, (req, res) => {
  res.json({
    name: 'LightSNS API',
    version: process.env.API_VERSION || 'v1',
    description: 'Optimized social network API for low-bandwidth environments',
    documentation: '/api/docs'
  });
});

// Mount route handlers
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const reactionRoutes = require('./routes/reactions');
const followRoutes = require('./routes/follows');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const notificationRoutes = require('./routes/notifications');

const API_VERSION = process.env.API_VERSION || 'v1';

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/posts`, postRoutes);
app.use(`/api/${API_VERSION}/posts`, reactionRoutes); // Emoji reactions
app.use(`/api/${API_VERSION}/follows`, followRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/messages`, messageRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      '/health',
      `/api/${process.env.API_VERSION}`
    ]
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize Socket.IO for real-time messaging
const io = initializeSocket(server);

// Make io accessible to request handlers
app.set('io', io);

// Initialize notification service with Socket.IO
const notificationService = require('./services/notificationService');
notificationService.init(io);

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`🚀 LightSNS API Server started`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    websocket: 'enabled'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  io.close(() => {
    logger.info('Socket.IO closed');
  });
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

module.exports = { app, server, io };
