const request = require('supertest');
const app = require('../../src/index');
const {
  createTestUser,
  createTestFollow,
  cleanupTestData,
  generateTestToken
} = require('../helpers/testHelpers');

describe('Follows API Integration Tests', () => {
  let user1, user2, user3, token1, token2;

  beforeEach(async () => {
    await cleanupTestData();

    user1 = await createTestUser({ username: 'followuser1' });
    user2 = await createTestUser({ username: 'followuser2' });
    user3 = await createTestUser({ username: 'followuser3' });

    token1 = generateTestToken(user1.id);
    token2 = generateTestToken(user2.id);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/follows/:userId', () => {
    it('should follow a user successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/follows/${user2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.follow).toBeDefined();
      expect(response.body.data.follow.follower_id).toBe(user1.id);
      expect(response.body.data.follow.following_id).toBe(user2.id);
    });

    it('should prevent self-following', async () => {
      const response = await request(app)
        .post(`/api/v1/follows/${user1.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot follow yourself');
    });

    it('should handle duplicate follows gracefully', async () => {
      await createTestFollow(user1.id, user2.id);

      const response = await request(app)
        .post(`/api/v1/follows/${user2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Already following');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/follows/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/follows/${user2.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/follows/:userId', () => {
    beforeEach(async () => {
      await createTestFollow(user1.id, user2.id);
    });

    it('should unfollow a user successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/follows/${user2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('unfollowed');
    });

    it('should return 404 when not following', async () => {
      const response = await request(app)
        .delete(`/api/v1/follows/${user3.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/follows/${user2.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/follows/:userId/followers', () => {
    beforeEach(async () => {
      await createTestFollow(user1.id, user3.id);
      await createTestFollow(user2.id, user3.id);
    });

    it('should get list of followers', async () => {
      const response = await request(app)
        .get(`/api/v1/follows/${user3.id}/followers`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.followers).toHaveLength(2);
      const followerIds = response.body.data.followers.map(f => f.id);
      expect(followerIds).toContain(user1.id);
      expect(followerIds).toContain(user2.id);
    });

    it('should return empty array when no followers', async () => {
      const response = await request(app)
        .get(`/api/v1/follows/${user1.id}/followers`)
        .expect(200);

      expect(response.body.data.followers).toEqual([]);
    });

    it('should add is_following status when authenticated', async () => {
      await createTestFollow(user1.id, user2.id); // user1 follows user2

      const response = await request(app)
        .get(`/api/v1/follows/${user3.id}/followers`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.data.followers).toHaveLength(2);

      // user1 should not be following user1 (themselves)
      const user2Follower = response.body.data.followers.find(f => f.id === user2.id);
      expect(user2Follower.is_following).toBeDefined();
    });
  });

  describe('GET /api/v1/follows/:userId/following', () => {
    beforeEach(async () => {
      await createTestFollow(user1.id, user2.id);
      await createTestFollow(user1.id, user3.id);
    });

    it('should get list of users being followed', async () => {
      const response = await request(app)
        .get(`/api/v1/follows/${user1.id}/following`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.following).toHaveLength(2);
      const followingIds = response.body.data.following.map(f => f.id);
      expect(followingIds).toContain(user2.id);
      expect(followingIds).toContain(user3.id);
    });

    it('should return empty array when not following anyone', async () => {
      const response = await request(app)
        .get(`/api/v1/follows/${user2.id}/following`)
        .expect(200);

      expect(response.body.data.following).toEqual([]);
    });
  });

  describe('GET /api/v1/follows/suggestions', () => {
    it('should get follow suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/follows/suggestions')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeDefined();
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    it('should not suggest already followed users', async () => {
      await createTestFollow(user1.id, user2.id);

      const response = await request(app)
        .get('/api/v1/follows/suggestions')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const suggestedIds = response.body.data.suggestions.map(s => s.id);
      expect(suggestedIds).not.toContain(user2.id);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/follows/suggestions')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/follows/:userId/mutual', () => {
    beforeEach(async () => {
      // user1 and user2 follow each other
      await createTestFollow(user1.id, user2.id);
      await createTestFollow(user2.id, user1.id);

      // user1 follows user3 but user3 doesn't follow back
      await createTestFollow(user1.id, user3.id);
    });

    it('should get mutual followers', async () => {
      const response = await request(app)
        .get(`/api/v1/follows/${user1.id}/mutual`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.mutualFollowers).toHaveLength(1);
      expect(response.body.data.mutualFollowers[0].id).toBe(user2.id);
    });

    it('should only allow viewing own mutual followers', async () => {
      const response = await request(app)
        .get(`/api/v1/follows/${user2.id}/mutual`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/follows/${user1.id}/mutual`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/follows/:userId/status', () => {
    beforeEach(async () => {
      await createTestFollow(user1.id, user2.id);
      await createTestFollow(user2.id, user1.id);
    });

    it('should get follow status between users', async () => {
      const response = await request(app)
        .get(`/api/v1/follows/${user2.id}/status`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isFollowing).toBe(true);
      expect(response.body.data.isFollowedBy).toBe(true);
      expect(response.body.data.isMutual).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/follows/${user2.id}/status`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/follows/:userId/followers/:followerId', () => {
    beforeEach(async () => {
      // user2 follows user1
      await createTestFollow(user2.id, user1.id);
    });

    it('should remove a follower', async () => {
      const response = await request(app)
        .delete(`/api/v1/follows/${user1.id}/followers/${user2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed');
    });

    it('should only allow removing from own followers', async () => {
      const response = await request(app)
        .delete(`/api/v1/follows/${user3.id}/followers/${user2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/follows/${user1.id}/followers/${user2.id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
