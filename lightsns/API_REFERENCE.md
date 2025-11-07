# LightSNS API Reference

**Base URL**: `http://localhost:3000/api/v1`
**Version**: v1
**Authentication**: Bearer Token (JWT)

---

## Table of Contents
1. [Authentication](#authentication)
2. [Posts](#posts)
3. [Follows](#follows)
4. [Users](#users)
5. [Messages](#messages)
6. [Notifications](#notifications)
7. [WebSocket Events](#websocket-events)
8. [Error Handling](#error-handling)

---

## Authentication

### Register
Create a new user account.

**Endpoint**: `POST /auth/register`
**Access**: Public

**Request Body**:
```json
{
  "username": "johndoe",
  "display_name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "phone_number": "+1234567890" // optional
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-10-28T10:00:00Z"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Login
Authenticate with username/email and password.

**Endpoint**: `POST /auth/login`
**Access**: Public

**Request Body**:
```json
{
  "identifier": "johndoe", // username, email, or phone
  "password": "SecurePass123"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Get Current User
Get authenticated user's profile.

**Endpoint**: `GET /auth/me`
**Access**: Private
**Headers**: `Authorization: Bearer {accessToken}`

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "email": "john@example.com",
      "bio": "Hello world",
      "avatar_url": "https://...",
      "is_verified": false,
      "created_at": "2025-10-28T10:00:00Z"
    }
  }
}
```

### Update Profile
Update user profile information.

**Endpoint**: `PATCH /auth/me`
**Access**: Private

**Request Body**:
```json
{
  "display_name": "John Updated",
  "bio": "New bio text"
}
```

### Logout
Invalidate current access token.

**Endpoint**: `POST /auth/logout`
**Access**: Private

---

## Posts

### Create Post
Create a new post.

**Endpoint**: `POST /posts`
**Access**: Private

**Request Body** (multipart/form-data or JSON):
```json
{
  "content": "This is my post! #excited",
  "location": "San Francisco", // optional
  "image": "file" // optional, multipart
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Post created successfully",
  "data": {
    "post": {
      "id": "uuid",
      "user_id": "uuid",
      "content": "This is my post! #excited",
      "hashtags": ["excited"],
      "location": "San Francisco",
      "image_url": "https://...",
      "created_at": "2025-10-28T10:00:00Z",
      "likes_count": 0,
      "comments_count": 0
    }
  }
}
```

### Get Feed
Get personalized feed of posts from followed users.

**Endpoint**: `GET /posts/feed?limit=20&cursor={postId}`
**Access**: Private

**Query Parameters**:
- `limit` (number, default: 20) - Number of posts to return
- `cursor` (string, optional) - Post ID for pagination

**Response** (200):
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "content": "Post content",
        "username": "johndoe",
        "display_name": "John Doe",
        "avatar_thumbnail_url": "https://...",
        "likes_count": 42,
        "comments_count": 5,
        "is_liked": true,
        "created_at": "2025-10-28T10:00:00Z"
      }
    ],
    "hasMore": true,
    "nextCursor": "uuid"
  }
}
```

### Like Post
Like a post.

**Endpoint**: `POST /posts/:id/like`
**Access**: Private

**Response** (200):
```json
{
  "success": true,
  "message": "Post liked successfully",
  "data": {
    "like": {
      "id": "uuid",
      "user_id": "uuid",
      "post_id": "uuid",
      "created_at": "2025-10-28T10:00:00Z"
    }
  }
}
```

### Add Comment
Add a comment to a post.

**Endpoint**: `POST /posts/:id/comments`
**Access**: Private

**Request Body**:
```json
{
  "content": "Great post!",
  "parent_id": "uuid" // optional, for replies
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "comment": {
      "id": "uuid",
      "user_id": "uuid",
      "post_id": "uuid",
      "content": "Great post!",
      "parent_id": null,
      "username": "johndoe",
      "created_at": "2025-10-28T10:00:00Z"
    }
  }
}
```

### Search by Hashtag
Find posts with specific hashtag.

**Endpoint**: `GET /posts/hashtag/:hashtag?limit=20&cursor={postId}`
**Access**: Public

---

## Follows

### Follow User
Follow another user.

**Endpoint**: `POST /follows/:userId`
**Access**: Private

**Response** (201):
```json
{
  "success": true,
  "message": "User followed successfully",
  "data": {
    "follow": {
      "follower_id": "uuid",
      "following_id": "uuid",
      "created_at": "2025-10-28T10:00:00Z"
    }
  }
}
```

### Unfollow User
Unfollow a user.

**Endpoint**: `DELETE /follows/:userId`
**Access**: Private

### Get Followers
Get list of user's followers.

**Endpoint**: `GET /follows/:userId/followers?limit=20&offset=0`
**Access**: Public

**Response** (200):
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "id": "uuid",
        "username": "follower1",
        "display_name": "Follower One",
        "avatar_thumbnail_url": "https://...",
        "is_verified": false,
        "is_following": true
      }
    ],
    "hasMore": false
  }
}
```

### Get Follow Suggestions
Get suggested users to follow based on mutual connections.

**Endpoint**: `GET /follows/suggestions?limit=10`
**Access**: Private

**Response** (200):
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "uuid",
        "username": "suggested_user",
        "display_name": "Suggested User",
        "avatar_thumbnail_url": "https://...",
        "followers_count": 1250,
        "mutual_count": 3
      }
    ]
  }
}
```

---

## Users

### Get User Profile
Get public profile of any user.

**Endpoint**: `GET /users/:userId`
**Access**: Public (optionally authenticated for follow status)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "bio": "Hello world",
      "avatar_url": "https://...",
      "is_verified": false,
      "stats": {
        "followers_count": 1250,
        "following_count": 350,
        "posts_count": 42
      },
      "is_following": true, // if authenticated
      "is_follower": false   // if authenticated
    }
  }
}
```

### Search Users
Search users by username or display name.

**Endpoint**: `GET /users/search?q={query}&limit=20&offset=0`
**Access**: Public

**Response** (200):
```json
{
  "success": true,
  "data": {
    "query": "john",
    "users": [
      {
        "id": "uuid",
        "username": "johndoe",
        "display_name": "John Doe",
        "avatar_thumbnail_url": "https://...",
        "is_verified": false,
        "is_following": false
      }
    ],
    "hasMore": true
  }
}
```

### Get Popular Users
Get list of popular users by follower count.

**Endpoint**: `GET /users/popular?limit=10`
**Access**: Public

---

## Messages

### Send Message
Send a direct message to another user.

**Endpoint**: `POST /messages`
**Access**: Private

**Request Body**:
```json
{
  "recipient_id": "uuid",
  "content": "Hello! How are you?",
  "image_url": "https://..." // optional
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message": {
      "id": "uuid",
      "sender_id": "uuid",
      "recipient_id": "uuid",
      "content": "Hello! How are you?",
      "is_read": false,
      "created_at": "2025-10-28T10:00:00Z"
    }
  }
}
```

### Get Conversations
Get list of all conversations.

**Endpoint**: `GET /messages/conversations?limit=20&offset=0`
**Access**: Private

**Response** (200):
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "content": "Last message preview...",
        "created_at": "2025-10-28T10:00:00Z",
        "other_user_username": "janedoe",
        "other_user_display_name": "Jane Doe",
        "other_user_avatar": "https://...",
        "unread_count": 3
      }
    ],
    "hasMore": false
  }
}
```

### Get Conversation
Get message history with a specific user.

**Endpoint**: `GET /messages/conversations/:userId?limit=50&cursor={messageId}`
**Access**: Private

**Response** (200):
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "sender_id": "uuid",
        "recipient_id": "uuid",
        "content": "Hello!",
        "is_read": true,
        "read_at": "2025-10-28T10:05:00Z",
        "created_at": "2025-10-28T10:00:00Z",
        "sender_username": "johndoe"
      }
    ],
    "hasMore": false
  }
}
```

### Mark Conversation as Read
Mark all messages from a user as read.

**Endpoint**: `POST /messages/:userId/read`
**Access**: Private

**Response** (200):
```json
{
  "success": true,
  "message": "Marked 3 message(s) as read",
  "data": {
    "count": 3
  }
}
```

### Get Unread Count
Get total unread message count.

**Endpoint**: `GET /messages/unread`
**Access**: Private

**Response** (200):
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

## Notifications

### Get Notifications
Get user's notifications.

**Endpoint**: `GET /notifications?limit=20&offset=0&unread=false`
**Access**: Private

**Query Parameters**:
- `limit` (number, default: 20)
- `offset` (number, default: 0)
- `unread` (boolean, default: false) - Only unread notifications

**Response** (200):
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "like",
        "actor_username": "janedoe",
        "actor_display_name": "Jane Doe",
        "actor_avatar": "https://...",
        "post_id": "uuid",
        "post_content": "My post...",
        "is_read": false,
        "created_at": "2025-10-28T10:00:00Z"
      }
    ],
    "hasMore": true
  }
}
```

### Get Unread Count
Get unread notification count.

**Endpoint**: `GET /notifications/unread/count`
**Access**: Private

**Response** (200):
```json
{
  "success": true,
  "data": {
    "count": 12
  }
}
```

### Mark as Read
Mark a notification as read.

**Endpoint**: `POST /notifications/:id/read`
**Access**: Private

### Mark All as Read
Mark all notifications as read.

**Endpoint**: `POST /notifications/read-all`
**Access**: Private

**Response** (200):
```json
{
  "success": true,
  "message": "Marked 12 notification(s) as read",
  "data": {
    "count": 12
  }
}
```

---

## WebSocket Events

### Connection
**URL**: `ws://localhost:3000`
**Authentication**: Send token in handshake

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client → Server Events

#### Send Message
```javascript
socket.emit('message:send', {
  recipientId: 'uuid',
  content: 'Hello!',
  image_url: null
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  }
});
```

#### Typing Indicators
```javascript
// Start typing
socket.emit('typing:start', { recipientId: 'uuid' });

// Stop typing
socket.emit('typing:stop', { recipientId: 'uuid' });
```

#### Read Receipts
```javascript
// Mark single message as read
socket.emit('message:read', {
  messageId: 'uuid',
  senderId: 'uuid'
});

// Mark conversation as read
socket.emit('conversation:read', {
  senderId: 'uuid'
});
```

### Server → Client Events

#### New Message
```javascript
socket.on('message:received', (message) => {
  console.log('New message:', message);
  // Update UI with new message
});
```

#### Typing Indicators
```javascript
socket.on('typing:start', ({ userId }) => {
  console.log(`User ${userId} is typing...`);
});

socket.on('typing:stop', ({ userId }) => {
  console.log(`User ${userId} stopped typing`);
});
```

#### Read Receipts
```javascript
socket.on('message:read', ({ messageId, readAt, readBy }) => {
  console.log(`Message ${messageId} was read by ${readBy}`);
});
```

#### User Presence
```javascript
socket.on('user:online', ({ userId }) => {
  console.log(`User ${userId} came online`);
});

socket.on('user:offline', ({ userId }) => {
  console.log(`User ${userId} went offline`);
});

socket.on('users:online', ({ userIds }) => {
  console.log('Online users:', userIds);
});
```

#### Notifications
```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  // Show notification badge, toast, etc.
});
```

---

## Error Handling

All API endpoints return consistent error responses:

### Error Response Format
```json
{
  "success": false,
  "error": "Error name",
  "message": "Human-readable error message",
  "details": [] // validation errors, if any
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

### Common Errors

#### Authentication Error
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "No token provided"
}
```

#### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Validation failed",
  "details": [
    {
      "field": "username",
      "message": "Username must be between 3 and 30 characters"
    }
  ]
}
```

#### Not Found Error
```json
{
  "success": false,
  "error": "Not Found",
  "message": "User not found"
}
```

---

## Rate Limiting

Currently implemented at the infrastructure level. Future versions will include:
- Per-user rate limits
- Per-endpoint rate limits
- Automatic throttling

---

## Pagination

### Cursor-Based (for feeds, messages)
Use the `cursor` parameter with the last item's ID:

```
GET /posts/feed?limit=20&cursor=last-post-id
```

### Offset-Based (for lists)
Use `limit` and `offset` parameters:

```
GET /users/search?q=john&limit=20&offset=40
```

---

## Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** (not in localStorage for web)
3. **Implement token refresh** before expiration
4. **Handle WebSocket reconnections** gracefully
5. **Cache user data** locally when possible
6. **Implement optimistic UI updates**
7. **Show loading states** during API calls
8. **Handle offline scenarios**

---

## Support

For issues or questions:
- GitHub Issues: [Link to repo]
- Documentation: This file
- Health Check: `GET /health`

---

**API Version**: v1
**Last Updated**: 2025-10-28
**Status**: Production Ready ✅
