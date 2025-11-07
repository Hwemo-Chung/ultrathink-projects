const Follow = require('../../src/models/Follow');
const {
  createTestUser,
  createTestFollow,
  cleanupTestData
} = require('../helpers/testHelpers');

describe('Follow Model', () => {
  let user1, user2, user3, user4;

  beforeEach(async () => {
    await cleanupTestData();

    // Create test users
    user1 = await createTestUser({ username: 'follower1' });
    user2 = await createTestUser({ username: 'following1' });
    user3 = await createTestUser({ username: 'mutual1' });
    user4 = await createTestUser({ username: 'popular1' });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('create()', () => {
    it('should create a follow relationship', async () => {
      const follow = await Follow.create(user1.id, user2.id);

      expect(follow).toBeDefined();
      expect(follow.follower_id).toBe(user1.id);
      expect(follow.following_id).toBe(user2.id);
      expect(follow.created_at).toBeDefined();
    });

    it('should prevent self-following', async () => {
      const follow = await Follow.create(user1.id, user1.id);

      expect(follow).toBeNull();
    });

    it('should handle duplicate follows gracefully', async () => {
      const follow1 = await Follow.create(user1.id, user2.id);
      expect(follow1).toBeDefined();

      const follow2 = await Follow.create(user1.id, user2.id);
      expect(follow2).toBeNull(); // Already following
    });
  });

  describe('delete()', () => {
    it('should delete a follow relationship', async () => {
      await createTestFollow(user1.id, user2.id);

      const success = await Follow.delete(user1.id, user2.id);

      expect(success).toBe(true);

      // Verify it's deleted
      const isFollowing = await Follow.isFollowing(user1.id, user2.id);
      expect(isFollowing).toBe(false);
    });

    it('should return false when relationship does not exist', async () => {
      const success = await Follow.delete(user1.id, user2.id);

      expect(success).toBe(false);
    });
  });

  describe('isFollowing()', () => {
    it('should return true when following', async () => {
      await createTestFollow(user1.id, user2.id);

      const isFollowing = await Follow.isFollowing(user1.id, user2.id);

      expect(isFollowing).toBe(true);
    });

    it('should return false when not following', async () => {
      const isFollowing = await Follow.isFollowing(user1.id, user2.id);

      expect(isFollowing).toBe(false);
    });
  });

  describe('getFollowers()', () => {
    it('should get list of followers', async () => {
      // user1, user2, user3 follow user4
      await createTestFollow(user1.id, user4.id);
      await createTestFollow(user2.id, user4.id);
      await createTestFollow(user3.id, user4.id);

      const followers = await Follow.getFollowers(user4.id, 10, 0);

      expect(followers).toHaveLength(3);
      expect(followers.map(f => f.id)).toContain(user1.id);
      expect(followers.map(f => f.id)).toContain(user2.id);
      expect(followers.map(f => f.id)).toContain(user3.id);
    });

    it('should return empty array when no followers', async () => {
      const followers = await Follow.getFollowers(user1.id, 10, 0);

      expect(followers).toEqual([]);
    });

    it('should respect limit', async () => {
      await createTestFollow(user1.id, user4.id);
      await createTestFollow(user2.id, user4.id);
      await createTestFollow(user3.id, user4.id);

      const followers = await Follow.getFollowers(user4.id, 2, 0);

      expect(followers.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getFollowing()', () => {
    it('should get list of users being followed', async () => {
      // user1 follows user2, user3, user4
      await createTestFollow(user1.id, user2.id);
      await createTestFollow(user1.id, user3.id);
      await createTestFollow(user1.id, user4.id);

      const following = await Follow.getFollowing(user1.id, 10, 0);

      expect(following).toHaveLength(3);
      expect(following.map(f => f.id)).toContain(user2.id);
      expect(following.map(f => f.id)).toContain(user3.id);
      expect(following.map(f => f.id)).toContain(user4.id);
    });

    it('should return empty array when not following anyone', async () => {
      const following = await Follow.getFollowing(user1.id, 10, 0);

      expect(following).toEqual([]);
    });
  });

  describe('getFollowerCount()', () => {
    it('should return correct follower count', async () => {
      await createTestFollow(user1.id, user4.id);
      await createTestFollow(user2.id, user4.id);
      await createTestFollow(user3.id, user4.id);

      const count = await Follow.getFollowerCount(user4.id);

      expect(count).toBe(3);
    });

    it('should return 0 when no followers', async () => {
      const count = await Follow.getFollowerCount(user1.id);

      expect(count).toBe(0);
    });
  });

  describe('getFollowingCount()', () => {
    it('should return correct following count', async () => {
      await createTestFollow(user1.id, user2.id);
      await createTestFollow(user1.id, user3.id);
      await createTestFollow(user1.id, user4.id);

      const count = await Follow.getFollowingCount(user1.id);

      expect(count).toBe(3);
    });

    it('should return 0 when not following anyone', async () => {
      const count = await Follow.getFollowingCount(user1.id);

      expect(count).toBe(0);
    });
  });

  describe('getMutualFollowers()', () => {
    it('should return mutual followers', async () => {
      // user1 and user2 follow each other
      await createTestFollow(user1.id, user2.id);
      await createTestFollow(user2.id, user1.id);

      // user1 and user3 follow each other
      await createTestFollow(user1.id, user3.id);
      await createTestFollow(user3.id, user1.id);

      // user1 follows user4 but user4 doesn't follow back
      await createTestFollow(user1.id, user4.id);

      const mutualFollowers = await Follow.getMutualFollowers(user1.id, 10, 0);

      expect(mutualFollowers).toHaveLength(2);
      expect(mutualFollowers.map(f => f.id)).toContain(user2.id);
      expect(mutualFollowers.map(f => f.id)).toContain(user3.id);
      expect(mutualFollowers.map(f => f.id)).not.toContain(user4.id);
    });

    it('should return empty array when no mutual followers', async () => {
      const mutualFollowers = await Follow.getMutualFollowers(user1.id, 10, 0);

      expect(mutualFollowers).toEqual([]);
    });
  });

  describe('getSuggestions()', () => {
    it('should suggest users based on mutual connections', async () => {
      const user5 = await createTestUser({ username: 'suggestion1' });

      // user1 follows user2
      await createTestFollow(user1.id, user2.id);

      // user2 also follows user5 (mutual connection)
      await createTestFollow(user2.id, user5.id);

      // user1 doesn't follow user5 yet
      const suggestions = await Follow.getSuggestions(user1.id, 10);

      const suggestedIds = suggestions.map(s => s.id);
      expect(suggestedIds).toContain(user5.id);
    });

    it('should not suggest users already being followed', async () => {
      await createTestFollow(user1.id, user2.id);

      const suggestions = await Follow.getSuggestions(user1.id, 10);

      const suggestedIds = suggestions.map(s => s.id);
      expect(suggestedIds).not.toContain(user2.id);
    });

    it('should not suggest the user themselves', async () => {
      const suggestions = await Follow.getSuggestions(user1.id, 10);

      const suggestedIds = suggestions.map(s => s.id);
      expect(suggestedIds).not.toContain(user1.id);
    });

    it('should respect limit', async () => {
      const suggestions = await Follow.getSuggestions(user1.id, 2);

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('removeFollower()', () => {
    it('should remove a follower', async () => {
      // user2 follows user1
      await createTestFollow(user2.id, user1.id);

      // user1 removes user2 as follower
      const success = await Follow.removeFollower(user1.id, user2.id);

      expect(success).toBe(true);

      // Verify removal
      const isFollowing = await Follow.isFollowing(user2.id, user1.id);
      expect(isFollowing).toBe(false);
    });

    it('should return false when follower does not exist', async () => {
      const success = await Follow.removeFollower(user1.id, user2.id);

      expect(success).toBe(false);
    });
  });
});
