# LightSNS Backend Test Suite

Comprehensive test suite for the LightSNS backend API following TDD principles.

## Test Structure

```
__tests__/
├── setup.js                    # Global test setup and teardown
├── helpers/
│   └── testHelpers.js         # Reusable test utilities
├── models/                    # Unit tests for data models
│   ├── User.test.js
│   ├── Follow.test.js
│   └── Post.test.js           # Includes Like and Comment tests
└── integration/               # API endpoint integration tests
    ├── auth.test.js
    ├── follows.test.js
    └── users.test.js
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### CI Mode
```bash
npm run test:ci
```

## Test Coverage

The test suite aims for 70%+ coverage across:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

Current coverage includes:
- ✅ User Model (create, find, update, delete, search)
- ✅ Follow Model (follow, unfollow, followers, suggestions)
- ✅ Post Model (CRUD, feed, hashtag search)
- ✅ Like Model (like, unlike, likers list)
- ✅ Comment Model (create, replies, delete)
- ✅ Auth API (register, login, refresh, logout, profile)
- ✅ Follows API (8 endpoints)
- ✅ Users API (5 endpoints)

## Test Utilities

### Helper Functions

Located in `helpers/testHelpers.js`:

- `createTestUser(overrides)` - Create a test user
- `createTestPost(userId, overrides)` - Create a test post
- `createTestFollow(followerId, followingId)` - Create a follow relationship
- `createTestLike(userId, postId)` - Create a like
- `createTestComment(userId, postId, overrides)` - Create a comment
- `generateTestToken(userId)` - Generate JWT token for testing
- `cleanupTestData()` - Clean up test data from database

### Example Usage

```javascript
const { createTestUser, generateTestToken } = require('../helpers/testHelpers');

describe('My Test Suite', () => {
  let user, token;

  beforeEach(async () => {
    user = await createTestUser({ username: 'testuser' });
    token = generateTestToken(user.id);
  });

  it('should test something', async () => {
    const response = await request(app)
      .get('/api/v1/some-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## Test Environment

Tests run with:
- **NODE_ENV**: test
- **Test Database**: lightsns_test (separate from development)
- **Redis DB**: 1 (separate from development)
- **Port**: 3001 (to avoid conflicts)

Configuration is loaded from `.env.test`.

## Writing New Tests

### Unit Tests (Models)

Test model methods directly:

```javascript
describe('MyModel', () => {
  describe('create()', () => {
    it('should create a new record', async () => {
      const data = { field: 'value' };
      const result = await MyModel.create(data);

      expect(result).toBeDefined();
      expect(result.field).toBe('value');
    });
  });
});
```

### Integration Tests (API)

Test HTTP endpoints with supertest:

```javascript
describe('GET /api/v1/my-endpoint', () => {
  it('should return success', async () => {
    const response = await request(app)
      .get('/api/v1/my-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data in `afterEach` or `afterAll`
3. **Descriptive Names**: Use clear, descriptive test names
4. **Arrange-Act-Assert**: Structure tests with setup, execution, and verification
5. **Mock External Services**: Mock third-party APIs and services
6. **Test Edge Cases**: Include tests for error conditions and edge cases

## Continuous Integration

Tests are designed to run in CI environments with:
- Parallel execution support
- Consistent timeouts (10 seconds)
- Proper cleanup to prevent test pollution
- Coverage reporting

## Troubleshooting

### Database Connection Issues
Ensure PostgreSQL is running and the test database exists:
```bash
createdb lightsns_test
```

### Redis Connection Issues
Ensure Redis is running:
```bash
redis-cli ping
```

### Port Conflicts
If port 3001 is in use, update `.env.test`:
```
PORT=3002
```

### Test Timeouts
Increase timeout in `jest.config.js`:
```javascript
testTimeout: 20000  // 20 seconds
```

## Future Enhancements

- [ ] Add E2E tests for critical user flows
- [ ] Add performance/load tests
- [ ] Add snapshot tests for API responses
- [ ] Implement test data factories
- [ ] Add mutation testing
- [ ] Add contract tests for API versioning

---

**Test Philosophy**: Tests should be fast, reliable, and provide confidence in the codebase. Every feature should have corresponding tests before deployment.
