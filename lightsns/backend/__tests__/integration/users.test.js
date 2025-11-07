const request = require('supertest');
const app = require('../../src/index');
const {
  createTestUser,
  createTestPost,
  createTestFollow,
  cleanupTestData,
  generateTestToken
} = require('../helpers/testHelpers');

describe('Users API Integration Tests', () => {
  let user1, user2, user3, token1;

  beforeEach(async () => {
    await cleanupTestData();

    user1 = await createTestUser({
      username: 'publicuser1',
      display_name: 'Public User One'
    });
    user2 = await createTestUser({
      username: 'publicuser2',
      display_name: 'Public User Two'
    });
    user3 = await createTestUser({
      username: 'searchableuser',
      display_name: 'Searchable User'
    });

    token1 = generateTestToken(user1.id);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/v1/users/:userId', () => {
    beforeEach(async () => {
      // Create posts and follows for user2
      await createTestPost(user2.id, { content: 'Post 1' });
      await createTestPost(user2.id, { content: 'Post 2' });
      await createTestFollow(user1.id, user2.id);
      await createTestFollow(user3.id, user2.id);
    });

    it('should get public user profile', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${user2.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user2.id);
      expect(response.body.data.user.username).toBe('publicuser2');
      expect(response.body.data.user.password_hash).toBeUndefined();
      expect(response.body.data.user.stats).toBeDefined();
      expect(response.body.data.user.stats.posts_count).toBe(2);
      expect(response.body.data.user.stats.followers_count).toBe(2);
    });

    it('should include follow status when authenticated', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${user2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data.user.is_following).toBe(true);
      expect(response.body.data.user.is_follower).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/username/:username', () => {
    it('should get user by username', async () => {
      const response = await request(app)
        .get('/api/v1/users/username/publicuser1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('publicuser1');
      expect(response.body.data.user.stats).toBeDefined();
    });

    it('should be case-insensitive', async () => {
      const response = await request(app)
        .get('/api/v1/users/username/PUBLICUSER1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('publicuser1');
    });

    it('should return 404 for non-existent username', async () => {
      const response = await request(app)
        .get('/api/v1/users/username/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/search', () => {
    it('should search users by username', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'publicuser' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(2);
      expect(response.body.data.query).toBe('publicuser');
    });

    it('should search users by display name', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'Searchable' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      const usernames = response.body.data.users.map(u => u.username);
      expect(usernames).toContain('searchableuser');
    });

    it('should include follow status when authenticated', async () => {
      await createTestFollow(user1.id, user2.id);

      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'publicuser' })
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const user2Result = response.body.data.users.find(u => u.id === user2.id);
      if (user2Result) {
        expect(user2Result.is_following).toBeDefined();
      }
    });

    it('should require minimum 2 characters', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'a' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'xyznonexistent123' })
        .expect(200);

      expect(response.body.data.users).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .query({ q: 'user', limit: 1 })
        .expect(200);

      expect(response.body.data.users.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/v1/users/:userId/stats', () => {
    beforeEach(async () => {
      // Create test data for user2
      await createTestPost(user2.id, { content: 'Post 1' });
      await createTestPost(user2.id, { content: 'Post 2' });
      await createTestPost(user2.id, { content: 'Post 3' });
      await createTestFollow(user1.id, user2.id);
      await createTestFollow(user3.id, user2.id);
      await createTestFollow(user2.id, user1.id);
    });

    it('should get user statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${user2.id}/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.posts_count).toBe(3);
      expect(response.body.data.stats.followers_count).toBe(2);
      expect(response.body.data.stats.following_count).toBe(1);
      expect(response.body.data.stats.likes_received_count).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000/stats')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/popular', () => {
    beforeEach(async () => {
      // Make user2 more popular
      await createTestFollow(user1.id, user2.id);
      await createTestFollow(user3.id, user2.id);
      await createTestPost(user2.id, { content: 'Popular post 1' });
      await createTestPost(user2.id, { content: 'Popular post 2' });
    });

    it('should get popular users', async () => {
      const response = await request(app)
        .get('/api/v1/users/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);

      // user2 should be in the popular list
      const popularUserIds = response.body.data.users.map(u => u.id);
      expect(popularUserIds).toContain(user2.id);
    });

    it('should include follow status when authenticated', async () => {
      await createTestFollow(user1.id, user2.id);

      const response = await request(app)
        .get('/api/v1/users/popular')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const user2Result = response.body.data.users.find(u => u.id === user2.id);
      if (user2Result) {
        expect(user2Result.is_following).toBeDefined();
      }
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/users/popular')
        .query({ limit: 2 })
        .expect(200);

      expect(response.body.data.users.length).toBeLessThanOrEqual(2);
    });

    it('should order by followers count', async () => {
      const response = await request(app)
        .get('/api/v1/users/popular')
        .expect(200);

      const users = response.body.data.users;

      if (users.length > 1) {
        // Check if ordered by followers_count (descending)
        for (let i = 0; i < users.length - 1; i++) {
          expect(users[i].followers_count).toBeGreaterThanOrEqual(
            users[i + 1].followers_count
          );
        }
      }
    });
  });
});
