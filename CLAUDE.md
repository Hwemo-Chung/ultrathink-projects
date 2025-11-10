# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is **LightSNS** - a social network platform optimized for low-bandwidth environments, targeting 2.2B users with slow internet connections. The MVP (v1.0.0) is complete and includes a Node.js/Express backend with PostgreSQL and Redis, plus React Native mobile app preparation.

**Key Stats:**
- Target app size: 15MB (94% reduction vs traditional SNS)
- Loading time: 2-3s @ 1Mbps
- Data usage: 10-30MB/month (90% reduction)
- Full offline mode support

## Project Structure

```
lightsns/
├── backend/              # Node.js + Express REST API
│   ├── src/
│   │   ├── config/      # Database, Redis configuration
│   │   ├── controllers/ # Business logic (8 controllers)
│   │   ├── middleware/  # Auth, upload, error handling
│   │   ├── models/      # Data models (8 models)
│   │   ├── routes/      # API routes (8 route files)
│   │   ├── services/    # WebSocket, notification services
│   │   └── utils/       # Logger, JWT, image processing, sanitization
│   ├── database/
│   │   └── migrations/  # SQL schema migrations
│   ├── __tests__/       # Jest test suites
│   └── package.json
├── mobile/              # React Native app (in preparation)
├── infrastructure/      # Docker Compose setup
└── lightsns-research/   # Project planning docs

Documentation files at root:
- README.md, FEATURES.md, API_REFERENCE.md
- DEPLOYMENT.md, PROJECT_COMPLETION.md
- ARCHITECTURE_REDESIGN.md, UI_UX_GUIDELINES.md
```

## Development Commands

### Backend Development

```bash
cd lightsns/backend

# Install dependencies
npm install

# Development server (with hot reload)
npm run dev

# Production server
npm start

# Debugging
npm run dev:debug           # Debug mode with auto-restart
npm run debug               # Debug mode, pause at first line

# Testing
npm test                    # Run all tests with coverage
npm run test:watch          # Watch mode
npm run test:unit           # Unit tests only (models)
npm run test:integration    # Integration tests only (API endpoints)
npm run test:ci             # CI mode (for GitHub Actions)

# Linting
npm run lint

# Database migrations
npm run migrate
```

### Chrome DevTools Debugging

1. Start backend in debug mode:
   ```bash
   npm run dev:debug
   ```

2. Open Chrome and navigate to:
   ```
   chrome://inspect
   ```

3. Click "inspect" under your running Node.js process

4. Use Chrome DevTools to:
   - Set breakpoints in Sources tab
   - View console output
   - Inspect network requests
   - Profile CPU and memory

See `backend/DEBUG_GUIDE.md` for detailed debugging instructions.

### Docker Environment

```bash
cd lightsns/infrastructure/docker

# Start all services (PostgreSQL, Redis, Backend API)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Health checks
curl http://localhost:3000/health
docker exec lightsns-postgres psql -U postgres -c "SELECT version();"
docker exec lightsns-redis redis-cli ping
```

### Individual Test Files

```bash
# Run specific test file
npm test __tests__/models/User.test.js

# Run integration test for specific endpoint
npm test __tests__/integration/auth.test.js

# With coverage for specific file
npm test -- --coverage --collectCoverageFrom="src/models/User.js"
```

## Architecture Patterns

### MVC Structure
- **Models** (`src/models/`): Direct database interaction, data validation
  - Each model exports: `create()`, `findById()`, `update()`, `delete()`, etc.
  - Uses parameterized queries for SQL injection prevention
  - Example: `User.js`, `Post.js`, `Message.js`

- **Controllers** (`src/controllers/`): Business logic and request handling
  - Validation using `express-validator`
  - Calls model methods and services
  - Returns standardized JSON responses
  - Example: `authController.js`, `postController.js`

- **Routes** (`src/routes/`): Express routers, endpoint definitions
  - Groups related endpoints
  - Applies authentication middleware where needed
  - Example: `auth.js`, `posts.js`, `messages.js`

### Database Layer

**Connection Pool** (`src/config/database.js`):
- PostgreSQL pool with 50 max connections, 10 idle minimum
- Helper functions:
  - `query(text, params)` - Direct query execution
  - `getClient()` - Get connection from pool
  - `withTransaction(callback)` - Execute function in transaction
  - `transaction(queries)` - Execute multiple queries in transaction

**Transaction Usage Pattern:**
```javascript
const { withTransaction } = require('./config/database');

await withTransaction(async (client) => {
  await client.query('INSERT INTO users ...', [params]);
  await client.query('INSERT INTO profiles ...', [params]);
  return result;
});
```

### Authentication & Security

- **JWT Authentication** (`src/utils/jwt.js`):
  - Access tokens (1h expiry) + Refresh tokens (30d expiry)
  - Token blacklist for logout (stored in Redis)
  - Auth middleware: `src/middleware/auth.js`

- **Input Sanitization** (`src/utils/sanitization.js`):
  - SQL injection detection middleware
  - Body and query parameter sanitization
  - Applied globally in `src/index.js`

- **Password Hashing** (`src/utils/password.js`):
  - bcrypt with automatic salting
  - `hashPassword()`, `comparePassword()` utilities

### Image Processing

**Upload Pipeline** (`src/middleware/upload.js`, `src/utils/imageProcessor.js`):
1. Multer handles multipart upload (10MB limit)
2. Sharp converts to WebP format
3. Compression (80% quality) + thumbnail generation (200x200)
4. Files stored in `uploads/` directory
5. Typical 90% size reduction

### Real-time Features

**WebSocket Service** (`src/services/socketService.js`):
- Socket.io with JWT authentication
- Events: messaging, typing indicators, notifications, online status
- Connected to Express server via `http.createServer(app)`

**Redis Caching** (`src/config/redis.js`):
- Feed caching (1-5 min TTL)
- Session data, token blacklist
- Unread message/notification counts

### API Response Format

**Success Response:**
```javascript
{
  success: true,
  data: { ... },
  message: "Operation successful"
}
```

**Error Response:**
```javascript
{
  success: false,
  error: "Error message",
  details: [ ... ] // Validation errors if applicable
}
```

### Testing Strategy

- **Test Setup** (`__tests__/setup.js`): Database cleanup, mock data helpers
- **Unit Tests** (`__tests__/models/`): Model methods, data validation
- **Integration Tests** (`__tests__/integration/`): Full API endpoint testing with supertest
- **Coverage Target**: 70% for branches, functions, lines, statements

## Key API Endpoints (50 total)

**Authentication** (`/api/v1/auth`):
- POST `/register`, `/login`, `/refresh`, `/logout`
- GET/PATCH `/me` (profile)
- POST/DELETE `/me/avatar` (profile image)

**Posts** (`/api/v1/posts`):
- CRUD: POST `/`, GET `/:id`, PATCH `/:id`, DELETE `/:id`
- GET `/feed` (timeline), `/user/:userId`, `/hashtag/:tag`
- POST/DELETE `/:id/like`, GET `/:id/likes`
- POST `/:id/comments`, GET `/:id/comments`, DELETE `/comments/:id`

**Social** (`/api/v1/follows`, `/api/v1/users`):
- Follow/unfollow, followers/following lists, suggestions
- User search, profiles, statistics

**Messaging** (`/api/v1/messages`):
- POST `/` (send), GET `/conversations`, `/conversations/:userId`
- Read receipts, unread counts

**Notifications** (`/api/v1/notifications`):
- GET `/`, `/unread/count`
- POST `/:id/read`, `/read-all`
- DELETE `/:id`, `/` (all)

## Environment Configuration

**Required `.env` variables** (see `.env.example`):
- `NODE_ENV`, `PORT`, `API_VERSION`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET`
- `CORS_ORIGIN`, `LOG_LEVEL`

**Production secrets generation:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## CI/CD Pipeline

GitHub Actions workflows (`.github/workflows/`):
- **ci.yml**: Quick tests, doc validation (all pushes/PRs)
- **backend-test.yml**: Full test suite on Node 18.x & 20.x
- **docker-build.yml**: Docker image build & GHCR deployment
- **release.yml**: Automated releases on version tags (`v*.*.*`)

**Create release:**
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Code Style & Conventions

- **Language**: JavaScript ES6+ (Node.js 18+)
- **Commit Messages**: Conventional Commits format
  - `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
- **Branching**: GitFlow-style
  - `main` (production), `develop` (integration)
  - `feature/*`, `bugfix/*`, `hotfix/*`
- **Linting**: ESLint configured (run `npm run lint`)
- **Formatting**: Follow existing code patterns

## Important Notes

- **Security**: All user inputs are sanitized. SQL queries use parameterized statements. JWT tokens are required for protected routes.
- **Performance**: Redis caching is used extensively. Database uses connection pooling with 50 max connections.
- **Low-bandwidth optimization**: Images auto-convert to WebP. API responses are compressed (Brotli/Gzip). Cursor-based pagination for large datasets.
- **Error Handling**: Centralized error handler in `src/middleware/errorHandler.js`. All errors are logged via Winston (`src/utils/logger.js`).

## Related Documentation

Comprehensive docs in `lightsns/` directory:
- **API_REFERENCE.md**: Complete API documentation (50 endpoints)
- **DEPLOYMENT.md**: Production deployment guide
- **FEATURES.md**: Feature overview with sprint breakdown
- **ARCHITECTURE_REDESIGN.md**: Low-bandwidth architecture analysis
- **UI_UX_GUIDELINES.md**: Design patterns for low-bandwidth UI

Research & planning docs in `lightsns-research/docs/`:
- PRD, technical design, project roadmap, comprehensive reports
