const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

/**
 * Image processing configuration based on technical design
 */
const IMAGE_CONFIG = {
  profile: {
    size: 400,
    thumbnail: 150,
    quality: 80
  },
  post: {
    size: 1080,
    thumbnail: 320,
    quality: 80
  },
  formats: {
    output: 'webp', // WebP for better compression
    fallback: 'jpeg'
  }
};

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
const ensureDir = async (dirPath) => {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
};

/**
 * Process profile image
 * @param {string} inputPath - Input file path
 * @param {string} outputDir - Output directory
 * @param {string} filename - Base filename (without extension)
 * @returns {Promise<Object>} { url, thumbnailUrl, metadata }
 */
const processProfileImage = async (inputPath, outputDir = 'uploads/profiles', filename = null) => {
  try {
    await ensureDir(outputDir);

    const baseName = filename || `profile-${Date.now()}`;
    const mainPath = path.join(outputDir, `${baseName}.webp`);
    const thumbPath = path.join(outputDir, `${baseName}-thumb.webp`);

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();

    logger.info('Processing profile image', {
      originalSize: metadata.size,
      dimensions: `${metadata.width}x${metadata.height}`
    });

    // Process main image (400x400)
    await sharp(inputPath)
      .resize(IMAGE_CONFIG.profile.size, IMAGE_CONFIG.profile.size, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: IMAGE_CONFIG.profile.quality })
      .toFile(mainPath);

    // Process thumbnail (150x150)
    await sharp(inputPath)
      .resize(IMAGE_CONFIG.profile.thumbnail, IMAGE_CONFIG.profile.thumbnail, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 70 })
      .toFile(thumbPath);

    // Get processed file sizes
    const mainStats = await fs.stat(mainPath);
    const thumbStats = await fs.stat(thumbPath);

    logger.info('Profile image processed', {
      mainSize: mainStats.size,
      thumbSize: thumbStats.size,
      compression: `${Math.round((1 - mainStats.size / metadata.size) * 100)}%`
    });

    // Delete original file
    await fs.unlink(inputPath);

    return {
      url: `/${mainPath}`,
      thumbnailUrl: `/${thumbPath}`,
      metadata: {
        width: IMAGE_CONFIG.profile.size,
        height: IMAGE_CONFIG.profile.size,
        size: mainStats.size,
        thumbnailSize: thumbStats.size,
        format: 'webp',
        originalSize: metadata.size
      }
    };
  } catch (error) {
    logger.error('Error processing profile image', { error: error.message });

    // Clean up on error
    try {
      await fs.unlink(inputPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    throw new Error('Image processing failed');
  }
};

/**
 * Process post image
 * @param {string} inputPath - Input file path
 * @param {string} outputDir - Output directory
 * @param {string} filename - Base filename (without extension)
 * @returns {Promise<Object>} { url, thumbnailUrl, metadata }
 */
const processPostImage = async (inputPath, outputDir = 'uploads/posts', filename = null) => {
  try {
    await ensureDir(outputDir);

    const baseName = filename || `post-${Date.now()}`;
    const mainPath = path.join(outputDir, `${baseName}.webp`);
    const thumbPath = path.join(outputDir, `${baseName}-thumb.webp`);

    // Get image metadata
    const metadata = await sharp(inputPath).metadata();

    logger.info('Processing post image', {
      originalSize: metadata.size,
      dimensions: `${metadata.width}x${metadata.height}`
    });

    // Process main image (max 1080x1080, maintain aspect ratio)
    await sharp(inputPath)
      .resize(IMAGE_CONFIG.post.size, IMAGE_CONFIG.post.size, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: IMAGE_CONFIG.post.quality })
      .toFile(mainPath);

    // Process thumbnail (320x320)
    await sharp(inputPath)
      .resize(IMAGE_CONFIG.post.thumbnail, IMAGE_CONFIG.post.thumbnail, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 70 })
      .toFile(thumbPath);

    // Get processed file sizes
    const mainStats = await fs.stat(mainPath);
    const thumbStats = await fs.stat(thumbPath);
    const mainMeta = await sharp(mainPath).metadata();

    logger.info('Post image processed', {
      mainSize: mainStats.size,
      thumbSize: thumbStats.size,
      compression: `${Math.round((1 - mainStats.size / metadata.size) * 100)}%`,
      dimensions: `${mainMeta.width}x${mainMeta.height}`
    });

    // Delete original file
    await fs.unlink(inputPath);

    return {
      url: `/${mainPath}`,
      thumbnailUrl: `/${thumbPath}`,
      metadata: {
        width: mainMeta.width,
        height: mainMeta.height,
        size: mainStats.size,
        thumbnailSize: thumbStats.size,
        format: 'webp',
        originalSize: metadata.size
      }
    };
  } catch (error) {
    logger.error('Error processing post image', { error: error.message });

    // Clean up on error
    try {
      await fs.unlink(inputPath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    throw new Error('Image processing failed');
  }
};

/**
 * Delete image and its thumbnail
 * @param {string} imagePath - Main image path
 */
const deleteImage = async (imagePath) => {
  try {
    // Delete main image
    await fs.unlink(imagePath.replace(/^\//, ''));

    // Delete thumbnail (if exists)
    const thumbPath = imagePath.replace(/^\//, '').replace(/(\.\w+)$/, '-thumb$1');
    try {
      await fs.unlink(thumbPath);
    } catch {
      // Thumbnail might not exist
    }

    logger.info('Image deleted', { path: imagePath });
  } catch (error) {
    logger.error('Error deleting image', { error: error.message, path: imagePath });
    throw error;
  }
};

/**
 * Get image info
 * @param {string} imagePath - Image path
 * @returns {Promise<Object>} Image metadata
 */
const getImageInfo = async (imagePath) => {
  try {
    const fullPath = imagePath.replace(/^\//, '');
    const stats = await fs.stat(fullPath);
    const metadata = await sharp(fullPath).metadata();

    return {
      size: stats.size,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      created: stats.birthtime
    };
  } catch (error) {
    logger.error('Error getting image info', { error: error.message, path: imagePath });
    throw error;
  }
};

module.exports = {
  processProfileImage,
  processPostImage,
  deleteImage,
  getImageInfo,
  IMAGE_CONFIG
};
