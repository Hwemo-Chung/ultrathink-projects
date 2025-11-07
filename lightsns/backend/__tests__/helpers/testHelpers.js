const jwt = require('jsonwebtoken');
const { hashPassword } = require('../../src/utils/password');
const db = require('../../src/config/database');

/**
 * Generate test JWT tokens
 */
function generateTestToken(userId, expiresIn = '1h') {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });
}

/**
 * Create a test user
 */
async function createTestUser(overrides = {}) {
  const defaultUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    phone_number: null,
    display_name: 'Test User',
    bio: 'Test bio',
    password_hash: await hashPassword('TestPassword123')
  };

  const userData = { ...defaultUser, ...overrides };

  const result = await db.query(
    `INSERT INTO users (username, email, phone_number, display_name, bio, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, username, email, display_name, bio, created_at`,
    [
      userData.username,
      userData.email,
      userData.phone_number,
      userData.display_name,
      userData.bio,
      userData.password_hash
    ]
  );

  return result.rows[0];
}

/**
 * Create a test post
 */
async function createTestPost(userId, overrides = {}) {
  const defaultPost = {
    content: `Test post ${Date.now()}`,
    location: null,
    hashtags: [],
    image_url: null,
    image_thumbnail_url: null
  };

  const postData = { ...defaultPost, ...overrides };

  const result = await db.query(
    `INSERT INTO posts (user_id, content, location, hashtags, image_url, image_thumbnail_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      postData.content,
      postData.location,
      postData.hashtags,
      postData.image_url,
      postData.image_thumbnail_url
    ]
  );

  return result.rows[0];
}

/**
 * Create a follow relationship
 */
async function createTestFollow(followerId, followingId) {
  const result = await db.query(
    `INSERT INTO follows (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, following_id) DO NOTHING
     RETURNING *`,
    [followerId, followingId]
  );

  return result.rows[0];
}

/**
 * Create a test comment
 */
async function createTestComment(userId, postId, overrides = {}) {
  const defaultComment = {
    content: `Test comment ${Date.now()}`,
    parent_id: null
  };

  const commentData = { ...defaultComment, ...overrides };

  const result = await db.query(
    `INSERT INTO comments (user_id, post_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, postId, commentData.content, commentData.parent_id]
  );

  return result.rows[0];
}

/**
 * Create a test like
 */
async function createTestLike(userId, postId) {
  const result = await db.query(
    `INSERT INTO likes (user_id, post_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, post_id) DO NOTHING
     RETURNING *`,
    [userId, postId]
  );

  return result.rows[0];
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  // Delete in order to respect foreign key constraints
  await db.query('DELETE FROM likes WHERE TRUE');
  await db.query('DELETE FROM comments WHERE TRUE');
  await db.query('DELETE FROM follows WHERE TRUE');
  await db.query('DELETE FROM posts WHERE TRUE');
  await db.query('DELETE FROM users WHERE username LIKE $1', ['testuser_%']);
}

/**
 * Wait for a specified time
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateTestToken,
  createTestUser,
  createTestPost,
  createTestFollow,
  createTestComment,
  createTestLike,
  cleanupTestData,
  wait
};
