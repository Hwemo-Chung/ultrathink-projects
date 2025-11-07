# Emoji Reactions System

## Overview

The emoji reactions system is the **core communication feature** of LightSNS, replacing traditional comments and replies. This design choice dramatically reduces bandwidth usage while maintaining meaningful social interaction.

## Design Philosophy

### Why Emoji-Only Communication?

1. **Bandwidth Efficiency**:
   - Comment text: 50-500 bytes per comment
   - Emoji reaction: 1 byte stored, 4 bytes transmitted (UTF-8)
   - **95% bandwidth reduction** compared to text comments

2. **Universal Language**:
   - No translation needed
   - Works across all cultures
   - Reduces cognitive load

3. **Faster Interaction**:
   - One tap to express sentiment
   - No typing required
   - Lower battery usage (no keyboard input)

4. **Lower Storage**:
   - ENUM type in database (1 byte)
   - Aggregated counts reduce query complexity

## Available Reactions

```javascript
const EMOJI_TYPES = {
  THUMBS_UP: '👍',  // Like, approval, agreement
  HEART: '❤️',      // Love, support
  LAUGH: '😂',      // Funny, humorous
  WOW: '😮',        // Surprising, impressive
  SAD: '😢',        // Sympathy, sadness
  CLAP: '👏'        // Congratulations, appreciation
};
```

## Database Schema

### Reactions Table

```sql
CREATE TYPE emoji_type AS ENUM ('👍', '❤️', '😂', '😮', '😢', '👏');

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji emoji_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- One reaction per user per post (user can change their reaction)
  UNIQUE(post_id, user_id)
);
```

### Indexes

```sql
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);
CREATE INDEX idx_reactions_emoji ON reactions(emoji);
CREATE INDEX idx_reactions_post_emoji ON reactions(post_id, emoji);
```

### Aggregated View

For high-performance queries:

```sql
CREATE VIEW post_reactions_aggregated AS
SELECT
  post_id,
  SUM(CASE WHEN emoji = '👍' THEN 1 ELSE 0 END) as thumbs_up,
  SUM(CASE WHEN emoji = '❤️' THEN 1 ELSE 0 END) as heart,
  SUM(CASE WHEN emoji = '😂' THEN 1 ELSE 0 END) as laugh,
  SUM(CASE WHEN emoji = '😮' THEN 1 ELSE 0 END) as wow,
  SUM(CASE WHEN emoji = '😢' THEN 1 ELSE 0 END) as sad,
  SUM(CASE WHEN emoji = '👏' THEN 1 ELSE 0 END) as clap,
  COUNT(*) as total_reactions
FROM reactions
GROUP BY post_id;
```

## API Endpoints

### 1. Add/Update Reaction

**Endpoint**: `POST /api/v1/posts/:id/react`

**Authentication**: Required

**Request Body**:
```json
{
  "emoji": "👍"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Reaction added successfully",
  "data": {
    "reaction": {
      "id": "uuid",
      "post_id": "uuid",
      "user_id": "uuid",
      "emoji": "👍",
      "created_at": "2025-11-05T12:00:00Z"
    }
  }
}
```

**Behavior**:
- If user hasn't reacted: Creates new reaction
- If user already reacted with same emoji: No change (idempotent)
- If user reacted with different emoji: Updates to new emoji (UPSERT)

### 2. Remove Reaction

**Endpoint**: `DELETE /api/v1/posts/:id/react`

**Authentication**: Required

**Response** (200):
```json
{
  "success": true,
  "message": "Reaction removed successfully"
}
```

### 3. Get Users Who Reacted

**Endpoint**: `GET /api/v1/posts/:id/reactions`

**Authentication**: Optional

**Query Parameters**:
- `emoji` (optional): Filter by specific emoji
- `limit` (default: 20): Number of results
- `offset` (default: 0): Pagination offset

**Response**:
```json
{
  "success": true,
  "data": {
    "reactions": [
      {
        "user_id": "uuid",
        "username": "johndoe",
        "full_name": "John Doe",
        "avatar_url": "https://...",
        "emoji": "👍",
        "reacted_at": "2025-11-05T12:00:00Z"
      }
    ],
    "hasMore": true
  }
}
```

### 4. Get Reaction Counts

**Endpoint**: `GET /api/v1/posts/:id/reactions/counts`

**Authentication**: Optional

**Response**:
```json
{
  "success": true,
  "data": {
    "counts": {
      "👍": 42,
      "❤️": 18,
      "😂": 7,
      "😮": 3,
      "😢": 1,
      "👏": 12
    },
    "total": 83,
    "user_reaction": "👍"
  }
}
```

## Post API Integration

All post retrieval endpoints now include reaction data:

### Single Post

`GET /api/v1/posts/:id`

```json
{
  "success": true,
  "data": {
    "post": {
      "id": "uuid",
      "content": "Hello world!",
      // ... other post fields
      "reactions": {
        "👍": 42,
        "❤️": 18,
        "😂": 7,
        "😮": 3,
        "😢": 1,
        "👏": 12
      },
      "user_reaction": "👍"
    }
  }
}
```

### Feed & User Posts

`GET /api/v1/posts/feed`
`GET /api/v1/posts/user/:userId`
`GET /api/v1/posts/hashtag/:hashtag`

All use **batch operations** to efficiently fetch reactions for multiple posts:

```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "content": "Post 1",
        "reactions": { "👍": 10, "❤️": 5 },
        "user_reaction": "👍"
      },
      {
        "id": "uuid",
        "content": "Post 2",
        "reactions": { "😂": 20 },
        "user_reaction": null
      }
    ]
  }
}
```

## Performance Optimizations

### 1. Batch Fetching

When loading multiple posts (feed, user posts, hashtag search), reactions are fetched in a single query:

```javascript
// Efficient batch operation
const postIds = posts.map(p => p.id);
const reactionsMap = await Reaction.getReactionsForPosts(postIds, userId);

// O(1) lookup for each post
posts.forEach(post => {
  post.reactions = reactionsMap[post.id].counts;
  post.user_reaction = reactionsMap[post.id].user_reaction;
});
```

### 2. Caching Strategy

```javascript
// Reaction counts cached for 30 seconds
cache.set(`reactions:post:${postId}`, counts, 30);

// User's reaction cached for 60 seconds
cache.set(`reaction:user:${userId}:post:${postId}`, reaction, 60);
```

**Why short TTL?**
- Reactions change frequently (high write volume)
- Showing slightly stale counts is acceptable
- Reduces cache invalidation complexity

### 3. Database Optimization

- **ENUM type**: 1 byte storage vs 4+ bytes for VARCHAR
- **Unique constraint**: Prevents duplicate reactions (integrity at DB level)
- **Indexes**: Fast lookups by post_id, user_id, emoji
- **Aggregated view**: Pre-computed counts for analytics

### 4. Response Payload Size

**Before (with comments)**:
```json
{
  "comments": [
    {
      "id": "...",
      "user": {...},
      "content": "This is a great post! I really enjoyed reading it.",
      "created_at": "...",
      "likes_count": 5
    }
    // ... 20 comments = ~5KB
  ]
}
```
**Total**: ~5KB for 20 comments

**After (with reactions)**:
```json
{
  "reactions": {
    "👍": 42,
    "❤️": 18,
    "😂": 7,
    "😮": 3,
    "😢": 1,
    "👏": 12
  },
  "user_reaction": "👍"
}
```
**Total**: ~100 bytes

**Bandwidth savings**: **98% reduction** 🎉

## Running the Migration

### Setup

1. Ensure PostgreSQL is running
2. Configure database credentials in `.env`
3. Run the migration:

```bash
cd lightsns/backend
npm run migrate
```

### Migration Script

The migration script (`scripts/migrate.js`):
- Tracks executed migrations in a `migrations` table
- Runs only pending migrations
- Uses transactions (ROLLBACK on failure)
- Provides clear success/error messages

### Manual Migration

If needed, run manually:

```bash
psql -U postgres -d lightsns_dev -f database/migrations/006_add_emoji_reactions.sql
```

## Testing

### Unit Tests

```javascript
describe('Reaction Model', () => {
  test('should add reaction to post', async () => {
    const reaction = await Reaction.addReaction({
      post_id: 'post-uuid',
      user_id: 'user-uuid',
      emoji: '👍'
    });
    expect(reaction.emoji).toBe('👍');
  });

  test('should update existing reaction', async () => {
    // Add first reaction
    await Reaction.addReaction({
      post_id: 'post-uuid',
      user_id: 'user-uuid',
      emoji: '👍'
    });

    // Change to different emoji
    const updated = await Reaction.addReaction({
      post_id: 'post-uuid',
      user_id: 'user-uuid',
      emoji: '❤️'
    });

    expect(updated.emoji).toBe('❤️');
  });

  test('should get reaction counts', async () => {
    const counts = await Reaction.getReactionCounts('post-uuid');
    expect(counts).toEqual({
      '👍': 10,
      '❤️': 5,
      '😂': 2
    });
  });
});
```

### Integration Tests

```javascript
describe('POST /api/v1/posts/:id/react', () => {
  test('should add reaction to post', async () => {
    const res = await request(app)
      .post('/api/v1/posts/post-uuid/react')
      .set('Authorization', `Bearer ${token}`)
      .send({ emoji: '👍' });

    expect(res.status).toBe(201);
    expect(res.body.data.reaction.emoji).toBe('👍');
  });

  test('should reject invalid emoji', async () => {
    const res = await request(app)
      .post('/api/v1/posts/post-uuid/react')
      .set('Authorization', `Bearer ${token}`)
      .send({ emoji: '🔥' }); // Not in allowed list

    expect(res.status).toBe(400);
  });
});
```

## Future Enhancements

### Phase 2: Offline Support

```javascript
// Queue reaction while offline
offlineQueue.add({
  type: 'REACTION',
  action: 'ADD',
  post_id: 'uuid',
  emoji: '👍',
  timestamp: Date.now()
});

// Sync when online
await syncReactions(offlineQueue.getReactions());
```

### Phase 3: Real-time Updates (Optional)

```javascript
// Socket.io event when someone reacts
socket.on('reaction:added', (data) => {
  updateReactionCount(data.post_id, data.emoji);
});
```

**Note**: Real-time updates are optional and may be disabled in low-bandwidth mode to save battery.

### Phase 4: Analytics

```sql
-- Most popular emoji overall
SELECT emoji, COUNT(*)
FROM reactions
GROUP BY emoji
ORDER BY COUNT(*) DESC;

-- User's emoji usage pattern
SELECT emoji, COUNT(*)
FROM reactions
WHERE user_id = $1
GROUP BY emoji;

-- Post engagement score
SELECT
  post_id,
  COUNT(*) as total_reactions,
  COUNT(DISTINCT user_id) as unique_reactors
FROM reactions
GROUP BY post_id
ORDER BY total_reactions DESC;
```

## Migration from Comments

### What to Remove

After emoji reactions are fully tested:

1. **Database**:
   - `comments` table (drop cascade)
   - Comment-related indexes
   - Comment count triggers

2. **Backend**:
   - `src/models/Comment.js`
   - `src/controllers/postController.js` (comment endpoints)
   - `src/routes/posts.js` (comment routes)

3. **API Endpoints** (to be removed):
   - `POST /api/v1/posts/:id/comments`
   - `GET /api/v1/posts/:id/comments`
   - `GET /api/v1/posts/comments/:commentId/replies`
   - `DELETE /api/v1/posts/comments/:commentId`

### Migration Strategy

```sql
-- Optional: Keep comment data for analysis
CREATE TABLE comments_archive AS SELECT * FROM comments;

-- Then drop comments
DROP TABLE comments CASCADE;
```

## Implementation Checklist

- [x] Database migration script
- [x] Reaction model with CRUD operations
- [x] Reaction controller with API endpoints
- [x] Reaction routes with validation
- [x] Post API integration (add reactions to responses)
- [x] Batch fetching optimization
- [x] Migration runner script
- [ ] Unit tests for Reaction model
- [ ] Integration tests for API endpoints
- [ ] Remove comments system
- [ ] Update API documentation
- [ ] Frontend implementation

## Performance Benchmarks

### Expected Metrics

- **Single post with reactions**: 15-20ms query time
- **Feed with 20 posts + reactions**: 50-80ms (batch fetch)
- **Add/update reaction**: 5-10ms
- **Cache hit rate**: >90% for popular posts

### Bandwidth Comparison

| Operation | With Comments | With Reactions | Savings |
|-----------|--------------|----------------|---------|
| Single post | 500B-5KB | 100-200B | 95-98% |
| Feed (20 posts) | 10-50KB | 2-4KB | 90-95% |
| Add comment/reaction | 50-500B | 4B | 99% |

## Conclusion

The emoji reactions system is the **foundation of LightSNS's low-bandwidth design**. By replacing text comments with emoji-only reactions, we achieve:

✅ **95%+ bandwidth reduction**
✅ **Faster load times**
✅ **Lower battery usage**
✅ **Universal communication**
✅ **Simpler offline sync**

This makes LightSNS viable for the 2.2 billion users with <1Mbps connections.
