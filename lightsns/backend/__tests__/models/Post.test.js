const Post = require('../../src/models/Post');
const Like = require('../../src/models/Like');
const Comment = require('../../src/models/Comment');
const {
  createTestUser,
  createTestPost,
  createTestFollow,
  createTestLike,
  createTestComment,
  cleanupTestData
} = require('../helpers/testHelpers');

describe('Post Model', () => {
  let user1, user2;

  beforeEach(async () => {
    await cleanupTestData();
    user1 = await createTestUser({ username: 'postuser1' });
    user2 = await createTestUser({ username: 'postuser2' });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('create()', () => {
    it('should create a post successfully', async () => {
      const postData = {
        user_id: user1.id,
        content: 'Test post content',
        hashtags: ['test', 'nodejs'],
        location: 'San Francisco'
      };

      const post = await Post.create(postData);

      expect(post).toBeDefined();
      expect(post.id).toBeDefined();
      expect(post.user_id).toBe(user1.id);
      expect(post.content).toBe('Test post content');
      expect(post.hashtags).toEqual(['test', 'nodejs']);
      expect(post.location).toBe('San Francisco');
      expect(post.is_deleted).toBe(false);
      expect(post.created_at).toBeDefined();
    });

    it('should create a post without optional fields', async () => {
      const postData = {
        user_id: user1.id,
        content: 'Simple post'
      };

      const post = await Post.create(postData);

      expect(post).toBeDefined();
      expect(post.hashtags).toEqual([]);
      expect(post.location).toBeNull();
      expect(post.image_url).toBeNull();
    });
  });

  describe('findById()', () => {
    it('should find a post by ID with user info', async () => {
      const createdPost = await createTestPost(user1.id, {
        content: 'Find me post'
      });

      const post = await Post.findById(createdPost.id);

      expect(post).toBeDefined();
      expect(post.id).toBe(createdPost.id);
      expect(post.content).toBe('Find me post');
      expect(post.username).toBe(user1.username);
      expect(post.display_name).toBe(user1.display_name);
      expect(post.likes_count).toBeDefined();
      expect(post.comments_count).toBeDefined();
    });

    it('should return null for non-existent post', async () => {
      const post = await Post.findById('00000000-0000-0000-0000-000000000000');

      expect(post).toBeNull();
    });

    it('should return null for deleted post', async () => {
      const createdPost = await createTestPost(user1.id);
      await Post.delete(createdPost.id, user1.id);

      const post = await Post.findById(createdPost.id);

      expect(post).toBeNull();
    });
  });

  describe('findByUserId()', () => {
    it('should find posts by user ID', async () => {
      await createTestPost(user1.id, { content: 'Post 1' });
      await createTestPost(user1.id, { content: 'Post 2' });
      await createTestPost(user2.id, { content: 'User 2 post' });

      const posts = await Post.findByUserId(user1.id);

      expect(posts).toHaveLength(2);
      expect(posts.every(p => p.user_id === user1.id)).toBe(true);
    });

    it('should respect limit', async () => {
      await createTestPost(user1.id, { content: 'Post 1' });
      await createTestPost(user1.id, { content: 'Post 2' });
      await createTestPost(user1.id, { content: 'Post 3' });

      const posts = await Post.findByUserId(user1.id, 2);

      expect(posts.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getFeed()', () => {
    it('should get feed from followed users', async () => {
      // user1 follows user2
      await createTestFollow(user1.id, user2.id);

      // user2 creates posts
      await createTestPost(user2.id, { content: 'Feed post 1' });
      await createTestPost(user2.id, { content: 'Feed post 2' });

      const feed = await Post.getFeed(user1.id, 20);

      expect(feed.length).toBeGreaterThan(0);
      expect(feed.some(p => p.user_id === user2.id)).toBe(true);
    });

    it('should include own posts in feed', async () => {
      await createTestPost(user1.id, { content: 'My own post' });

      const feed = await Post.getFeed(user1.id, 20);

      expect(feed.length).toBeGreaterThan(0);
      expect(feed.some(p => p.user_id === user1.id)).toBe(true);
    });
  });

  describe('searchByHashtag()', () => {
    it('should find posts by hashtag', async () => {
      await createTestPost(user1.id, {
        content: 'Test post',
        hashtags: ['nodejs', 'javascript']
      });
      await createTestPost(user2.id, {
        content: 'Another post',
        hashtags: ['nodejs', 'backend']
      });
      await createTestPost(user2.id, {
        content: 'Different post',
        hashtags: ['python']
      });

      const posts = await Post.searchByHashtag('nodejs', 20);

      expect(posts).toHaveLength(2);
      expect(posts.every(p => p.hashtags.includes('nodejs'))).toBe(true);
    });

    it('should return empty array for non-existent hashtag', async () => {
      const posts = await Post.searchByHashtag('nonexistent', 20);

      expect(posts).toEqual([]);
    });
  });

  describe('update()', () => {
    it('should update post content', async () => {
      const createdPost = await createTestPost(user1.id, {
        content: 'Original content'
      });

      const updatedPost = await Post.update(createdPost.id, user1.id, {
        content: 'Updated content'
      });

      expect(updatedPost.content).toBe('Updated content');
    });

    it('should not allow updating other users posts', async () => {
      const createdPost = await createTestPost(user1.id);

      await expect(
        Post.update(createdPost.id, user2.id, { content: 'Hacked' })
      ).rejects.toThrow();
    });
  });

  describe('delete()', () => {
    it('should soft delete a post', async () => {
      const createdPost = await createTestPost(user1.id);

      const success = await Post.delete(createdPost.id, user1.id);

      expect(success).toBe(true);

      // Post should not be found after deletion
      const deletedPost = await Post.findById(createdPost.id);
      expect(deletedPost).toBeNull();
    });

    it('should not allow deleting other users posts', async () => {
      const createdPost = await createTestPost(user1.id);

      await expect(
        Post.delete(createdPost.id, user2.id)
      ).rejects.toThrow();
    });
  });
});

describe('Like Model', () => {
  let user1, user2, post1;

  beforeEach(async () => {
    await cleanupTestData();
    user1 = await createTestUser({ username: 'likeuser1' });
    user2 = await createTestUser({ username: 'likeuser2' });
    post1 = await createTestPost(user1.id, { content: 'Post to like' });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('create()', () => {
    it('should create a like successfully', async () => {
      const like = await Like.create(user1.id, post1.id);

      expect(like).toBeDefined();
      expect(like.user_id).toBe(user1.id);
      expect(like.post_id).toBe(post1.id);
      expect(like.created_at).toBeDefined();
    });

    it('should handle duplicate likes gracefully', async () => {
      const like1 = await Like.create(user1.id, post1.id);
      expect(like1).toBeDefined();

      const like2 = await Like.create(user1.id, post1.id);
      expect(like2).toBeNull(); // Already liked
    });
  });

  describe('delete()', () => {
    it('should delete a like', async () => {
      await createTestLike(user1.id, post1.id);

      const success = await Like.delete(user1.id, post1.id);

      expect(success).toBe(true);

      // Verify it's deleted
      const isLiked = await Like.isLiked(user1.id, post1.id);
      expect(isLiked).toBe(false);
    });

    it('should return false when like does not exist', async () => {
      const success = await Like.delete(user1.id, post1.id);

      expect(success).toBe(false);
    });
  });

  describe('isLiked()', () => {
    it('should return true when post is liked', async () => {
      await createTestLike(user1.id, post1.id);

      const isLiked = await Like.isLiked(user1.id, post1.id);

      expect(isLiked).toBe(true);
    });

    it('should return false when post is not liked', async () => {
      const isLiked = await Like.isLiked(user1.id, post1.id);

      expect(isLiked).toBe(false);
    });
  });

  describe('getLikers()', () => {
    it('should get list of users who liked a post', async () => {
      await createTestLike(user1.id, post1.id);
      await createTestLike(user2.id, post1.id);

      const likers = await Like.getLikers(post1.id, 10, 0);

      expect(likers).toHaveLength(2);
      expect(likers.map(l => l.id)).toContain(user1.id);
      expect(likers.map(l => l.id)).toContain(user2.id);
    });

    it('should return empty array when no likes', async () => {
      const likers = await Like.getLikers(post1.id, 10, 0);

      expect(likers).toEqual([]);
    });
  });
});

describe('Comment Model', () => {
  let user1, user2, post1;

  beforeEach(async () => {
    await cleanupTestData();
    user1 = await createTestUser({ username: 'commentuser1' });
    user2 = await createTestUser({ username: 'commentuser2' });
    post1 = await createTestPost(user1.id, { content: 'Post to comment' });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('create()', () => {
    it('should create a comment successfully', async () => {
      const commentData = {
        user_id: user1.id,
        post_id: post1.id,
        content: 'Test comment'
      };

      const comment = await Comment.create(commentData);

      expect(comment).toBeDefined();
      expect(comment.id).toBeDefined();
      expect(comment.user_id).toBe(user1.id);
      expect(comment.post_id).toBe(post1.id);
      expect(comment.content).toBe('Test comment');
      expect(comment.parent_id).toBeNull();
    });

    it('should create a reply to a comment', async () => {
      const parentComment = await createTestComment(user1.id, post1.id, {
        content: 'Parent comment'
      });

      const replyData = {
        user_id: user2.id,
        post_id: post1.id,
        content: 'Reply comment',
        parent_id: parentComment.id
      };

      const reply = await Comment.create(replyData);

      expect(reply.parent_id).toBe(parentComment.id);
    });
  });

  describe('findById()', () => {
    it('should find a comment by ID with user info', async () => {
      const createdComment = await createTestComment(user1.id, post1.id, {
        content: 'Find me comment'
      });

      const comment = await Comment.findById(createdComment.id);

      expect(comment).toBeDefined();
      expect(comment.id).toBe(createdComment.id);
      expect(comment.content).toBe('Find me comment');
      expect(comment.username).toBe(user1.username);
    });
  });

  describe('findByPostId()', () => {
    it('should find comments for a post', async () => {
      await createTestComment(user1.id, post1.id, { content: 'Comment 1' });
      await createTestComment(user2.id, post1.id, { content: 'Comment 2' });

      const comments = await Comment.findByPostId(post1.id, 20, 0);

      expect(comments).toHaveLength(2);
      expect(comments.every(c => c.post_id === post1.id)).toBe(true);
    });

    it('should only return top-level comments', async () => {
      const parentComment = await createTestComment(user1.id, post1.id);
      await createTestComment(user2.id, post1.id, {
        parent_id: parentComment.id
      });

      const comments = await Comment.findByPostId(post1.id, 20, 0);

      // Should only return parent comment, not the reply
      expect(comments.every(c => c.parent_id === null)).toBe(true);
    });
  });

  describe('findReplies()', () => {
    it('should find replies to a comment', async () => {
      const parentComment = await createTestComment(user1.id, post1.id);
      await createTestComment(user2.id, post1.id, {
        content: 'Reply 1',
        parent_id: parentComment.id
      });
      await createTestComment(user1.id, post1.id, {
        content: 'Reply 2',
        parent_id: parentComment.id
      });

      const replies = await Comment.findReplies(parentComment.id, 20, 0);

      expect(replies).toHaveLength(2);
      expect(replies.every(r => r.parent_id === parentComment.id)).toBe(true);
    });
  });

  describe('delete()', () => {
    it('should soft delete a comment', async () => {
      const createdComment = await createTestComment(user1.id, post1.id);

      const success = await Comment.delete(createdComment.id, user1.id);

      expect(success).toBe(true);
    });

    it('should not allow deleting other users comments', async () => {
      const createdComment = await createTestComment(user1.id, post1.id);

      await expect(
        Comment.delete(createdComment.id, user2.id)
      ).rejects.toThrow();
    });
  });
});
