const multer = require('multer');
const path = require('path');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store in uploads/temp, will be processed and moved later
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId-timestamp-randomString.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.user?.id || 'temp'}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images only
const imageFilter = (req, file, cb) => {
  // Accept images only
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1 // Only one file per upload
  }
});

/**
 * Middleware for single image upload
 * @param {string} fieldName - Form field name (default: 'image')
 */
const uploadSingle = (fieldName = 'image') => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);

    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error', { error: err.message, code: err.code });

        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('File too large. Maximum size is 10MB', 400));
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new AppError('Too many files. Only one file allowed', 400));
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new AppError('Unexpected file field', 400));
        } else {
          return next(new AppError('File upload error', 400));
        }
      } else if (err) {
        logger.error('Upload error', { error: err.message });
        return next(err);
      }

      // No file uploaded is OK for optional uploads
      if (!req.file) {
        logger.debug('No file uploaded');
      } else {
        logger.info('File uploaded', {
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        });
      }

      next();
    });
  };
};

/**
 * Middleware to validate that a file was uploaded
 */
const requireFile = (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }
  next();
};

/**
 * Middleware for multiple images upload
 * @param {string} fieldName - Form field name
 * @param {number} maxCount - Maximum number of files
 */
const uploadMultiple = (fieldName = 'images', maxCount = 5) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.array(fieldName, maxCount);

    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        logger.error('Multer error', { error: err.message, code: err.code });

        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError('File too large. Maximum size is 10MB', 400));
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new AppError(`Too many files. Maximum ${maxCount} files allowed`, 400));
        } else {
          return next(new AppError('File upload error', 400));
        }
      } else if (err) {
        return next(err);
      }

      if (!req.files || req.files.length === 0) {
        logger.debug('No files uploaded');
      } else {
        logger.info('Files uploaded', {
          count: req.files.length,
          totalSize: req.files.reduce((sum, file) => sum + file.size, 0)
        });
      }

      next();
    });
  };
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  requireFile
};
