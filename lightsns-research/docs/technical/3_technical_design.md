# LightSNS - 기술 설계서

**문서 번호:** TECH-LSN-003
**버전:** 1.0
**작성일:** 2025-10-27
**상태:** ✅ 승인됨
**작성자:** ULTRATHINK Tech Team

---

## 📋 목차

1. [시스템 아키텍처](#시스템-아키텍처)
2. [기술 스택](#기술-스택)
3. [데이터베이스 설계](#데이터베이스-설계)
4. [API 설계](#api-설계)
5. [최적화 전략](#최적화-전략)
6. [보안 설계](#보안-설계)
7. [인프라 설계](#인프라-설계)
8. [모니터링 & 로깅](#모니터링--로깅)

---

## 🏗️ 시스템 아키텍처

### 전체 아키텍처

```
┌─────────────────────────────────────────────┐
│           클라이언트 레이어                    │
├─────────────────────────────────────────────┤
│  React Native App (iOS/Android)             │
│  - Redux (상태 관리)                         │
│  - React Query (데이터 캐싱)                 │
│  - AsyncStorage (로컬 저장소)                │
└──────────────┬──────────────────────────────┘
               │
               ↓ HTTPS/WSS
┌──────────────┴──────────────────────────────┐
│            CDN 레이어                        │
├─────────────────────────────────────────────┤
│  CloudFlare CDN                             │
│  - 정적 에셋 (이미지, CSS, JS)               │
│  - 엣지 캐싱                                  │
│  - DDoS 보호                                 │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌──────────────┴──────────────────────────────┐
│          애플리케이션 레이어                   │
├─────────────────────────────────────────────┤
│  Load Balancer (ALB)                        │
│    ↓                                        │
│  API Gateway                                │
│    ↓                                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ API     │  │WebSocket│  │ Worker  │     │
│  │ Server  │  │ Server  │  │ Queue   │     │
│  │(Node.js)│  │(Node.js)│  │(Bull)   │     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
└───────┼───────────┼────────────┼───────────┘
        │           │            │
        ↓           ↓            ↓
┌───────┴───────────┴────────────┴───────────┐
│            데이터 레이어                      │
├─────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │PostgreSQL│  │  Redis   │  │   S3     │  │
│  │(주 DB)   │  │ (캐시)   │  │(저장소)  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

### 아키텍처 원칙

#### 1. 경량 우선 (Light-First)
```yaml
원칙: 모든 결정에서 데이터 효율성을 최우선
구현:
  - 최소 페이로드
  - 압축 우선
  - 캐싱 적극 활용
```

#### 2. 오프라인 우선 (Offline-First)
```yaml
원칙: 네트워크 없이도 작동
구현:
  - 로컬 데이터베이스
  - 동기화 큐
  - 충돌 해결
```

#### 3. 점진적 개선 (Progressive Enhancement)
```yaml
원칙: 기본 기능 먼저, 고급 기능은 조건부
구현:
  - 텍스트 우선 로딩
  - 이미지 지연 로딩
  - 선택적 기능 활성화
```

#### 4. 확장 가능 (Scalable)
```yaml
원칙: 1M → 10M → 100M 사용자 대응
구현:
  - 마이크로서비스 아키텍처
  - 수평 확장 가능
  - 캐싱 레이어
```

---

## 🔧 기술 스택

### 프론트엔드

#### React Native
```yaml
버전: 0.72+
선택 이유:
  - 크로스 플랫폼 (iOS/Android)
  - 성능 우수
  - 큰 커뮤니티
  - 경량 빌드 가능

최적화:
  - Hermes 엔진 사용
  - 코드 스플리팅
  - 번들 크기 최소화
  - 네이티브 모듈 최소화

예상 앱 크기:
  - Android: 15MB
  - iOS: 18MB
```

#### 상태 관리
```yaml
Redux Toolkit:
  - 글로벌 상태 관리
  - 미들웨어 지원
  - DevTools 통합

React Query:
  - 서버 상태 관리
  - 자동 캐싱
  - 백그라운드 업데이트
  - 오프라인 지원
```

#### 로컬 저장소
```yaml
AsyncStorage:
  - 기본 데이터 저장
  - 사용자 설정
  - 인증 토큰

WatermelonDB:
  - 복잡한 데이터 구조
  - 오프라인 데이터베이스
  - 동기화 지원
```

### 백엔드

#### Node.js + Express
```yaml
버전: Node 18 LTS, Express 4.18+
선택 이유:
  - 빠른 개발
  - 비동기 I/O
  - 대규모 생태계
  - WebSocket 지원

프레임워크 구조:
  src/
  ├── controllers/   # 요청 처리
  ├── services/      # 비즈니스 로직
  ├── models/        # 데이터 모델
  ├── routes/        # API 라우팅
  ├── middleware/    # 미들웨어
  └── utils/         # 유틸리티
```

#### GraphQL (선택적)
```yaml
Apollo Server:
  - 효율적 데이터 페칭
  - 클라이언트 맞춤 쿼리
  - 단일 엔드포인트

고려 사항:
  - Phase 2 도입
  - REST와 병행
  - 데이터 사용량 비교
```

### 데이터베이스

#### PostgreSQL
```yaml
버전: 14+
선택 이유:
  - 신뢰성
  - JSONB 지원
  - 풍부한 확장
  - 트랜잭션 지원

사용 사례:
  - 사용자 데이터
  - 게시물 데이터
  - 관계 데이터
```

#### Redis
```yaml
버전: 7+
선택 이유:
  - 초고속 캐싱
  - 다양한 데이터 구조
  - Pub/Sub 지원

사용 사례:
  - 세션 저장
  - API 응답 캐싱
  - 실시간 기능
  - 작업 큐
```

### 인프라

#### AWS
```yaml
컴퓨트:
  - EC2: API 서버
  - ECS/Fargate: 컨테이너 오케스트레이션
  - Lambda: 백그라운드 작업

스토리지:
  - S3: 이미지/파일 저장
  - EBS: 데이터베이스 저장소

네트워크:
  - ALB: 로드 밸런싱
  - CloudFront: CDN (백업)
  - Route 53: DNS

데이터베이스:
  - RDS: PostgreSQL 관리형
  - ElastiCache: Redis 관리형
```

#### CloudFlare
```yaml
서비스:
  - CDN: 글로벌 콘텐츠 전송
  - DDoS 보호
  - SSL/TLS
  - 에셋 최적화

이점:
  - 저렴한 비용
  - 전 세계 POPs
  - 자동 최적화
```

### DevOps

#### CI/CD
```yaml
GitHub Actions:
  - 자동 테스트
  - 자동 빌드
  - 자동 배포

워크플로우:
  1. 코드 푸시
  2. 린트 & 테스트
  3. 빌드
  4. 스테이징 배포
  5. 검증
  6. 프로덕션 배포
```

#### 컨테이너화
```yaml
Docker:
  - 일관된 환경
  - 쉬운 배포
  - 격리

Docker Compose:
  - 로컬 개발
  - 여러 서비스 관리
```

#### 모니터링
```yaml
Sentry:
  - 에러 추적
  - 성능 모니터링

DataDog (선택):
  - 인프라 모니터링
  - APM
  - 로그 집계

Google Analytics:
  - 사용자 분석
  - 행동 추적
```

---

## 💾 데이터베이스 설계

### 스키마 설계

#### Users (사용자)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url VARCHAR(500),
  avatar_thumbnail_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',

  -- 인덱스
  INDEX idx_username (username),
  INDEX idx_phone (phone_number),
  INDEX idx_email (email)
);
```

#### Posts (게시물)
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  image_thumbnail_url VARCHAR(500),
  image_metadata JSONB, -- {width, height, size}
  location VARCHAR(255),
  hashtags TEXT[], -- 해시태그 배열
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP,

  -- 인덱스
  INDEX idx_user_posts (user_id, created_at DESC),
  INDEX idx_hashtags USING GIN (hashtags),
  INDEX idx_created (created_at DESC)
);
```

#### Likes (좋아요)
```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  post_id UUID NOT NULL REFERENCES posts(id),
  created_at TIMESTAMP DEFAULT NOW(),

  -- 중복 방지
  UNIQUE (user_id, post_id),

  -- 인덱스
  INDEX idx_user_likes (user_id, created_at DESC),
  INDEX idx_post_likes (post_id, created_at DESC)
);
```

#### Comments (댓글)
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  post_id UUID NOT NULL REFERENCES posts(id),
  parent_id UUID REFERENCES comments(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,

  -- 인덱스
  INDEX idx_post_comments (post_id, created_at DESC),
  INDEX idx_user_comments (user_id, created_at DESC),
  INDEX idx_parent_comments (parent_id)
);
```

#### Follows (팔로우)
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),

  -- 중복 방지
  UNIQUE (follower_id, following_id),

  -- 자기 자신 팔로우 방지
  CHECK (follower_id != following_id),

  -- 인덱스
  INDEX idx_followers (following_id),
  INDEX idx_following (follower_id)
);
```

#### Messages (메시지)
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  image_url VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,

  -- 인덱스
  INDEX idx_conversation (
    LEAST(sender_id, recipient_id),
    GREATEST(sender_id, recipient_id),
    created_at DESC
  ),
  INDEX idx_sender (sender_id, created_at DESC),
  INDEX idx_recipient (recipient_id, created_at DESC)
);
```

#### Notifications (알림)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- like, comment, follow, message
  actor_id UUID REFERENCES users(id),
  post_id UUID REFERENCES posts(id),
  comment_id UUID REFERENCES comments(id),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),

  -- 인덱스
  INDEX idx_user_notifications (user_id, is_read, created_at DESC)
);
```

### 데이터 최적화 전략

#### 1. 파티셔닝
```sql
-- 게시물을 월별로 파티셔닝
CREATE TABLE posts_2025_10 PARTITION OF posts
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE posts_2025_11 PARTITION OF posts
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

#### 2. 인덱스 최적화
```sql
-- 복합 인덱스
CREATE INDEX idx_feed ON posts (user_id, created_at DESC)
  WHERE is_deleted = FALSE;

-- 부분 인덱스
CREATE INDEX idx_unread_messages ON messages (recipient_id)
  WHERE is_read = FALSE;
```

#### 3. 캐싱 전략
```yaml
Redis 캐싱:
  피드:
    - 키: "feed:user:{user_id}"
    - TTL: 5분
    - 저장: 최근 50개 게시물 ID

  프로필:
    - 키: "profile:{user_id}"
    - TTL: 30분
    - 저장: 전체 프로필 데이터

  카운트:
    - 키: "count:post:{post_id}:likes"
    - TTL: 없음 (영구)
    - 저장: 좋아요 수
```

---

## 🔌 API 설계

### RESTful API

#### 인증
```yaml
POST /api/v1/auth/register
  요청:
    {
      "phone_number": "+821012345678",
      "username": "john_doe",
      "display_name": "John Doe"
    }
  응답:
    {
      "user": {...},
      "token": "jwt_token"
    }

POST /api/v1/auth/login
  요청:
    {
      "phone_number": "+821012345678",
      "password": "hashed"
    }
  응답:
    {
      "user": {...},
      "token": "jwt_token"
    }
```

#### 사용자
```yaml
GET /api/v1/users/:id
  응답:
    {
      "id": "uuid",
      "username": "john_doe",
      "display_name": "John Doe",
      "bio": "Hello world",
      "avatar_url": "https://...",
      "followers_count": 120,
      "following_count": 80,
      "posts_count": 45
    }

PATCH /api/v1/users/me
  요청:
    {
      "display_name": "New Name",
      "bio": "New bio"
    }
```

#### 게시물
```yaml
GET /api/v1/posts/feed
  쿼리:
    - limit: 10-50 (기본 20)
    - cursor: 페이지네이션
    - mode: "light" | "full"

  응답 (light 모드):
    {
      "posts": [
        {
          "id": "uuid",
          "user": {
            "id": "uuid",
            "username": "john",
            "avatar_thumbnail": "url"
          },
          "content": "텍스트...",
          "thumbnail": "url", // 저해상도
          "likes_count": 42,
          "comments_count": 8,
          "created_at": "2025-10-27T00:00:00Z"
        }
      ],
      "next_cursor": "cursor_string"
    }

  최적화:
    - light 모드: 썸네일만, 데이터 90% 절감
    - 압축: Brotli
    - 캐싱: 5분

POST /api/v1/posts
  요청:
    {
      "content": "Hello world",
      "image": "base64 or presigned_url",
      "location": "Seoul, Korea",
      "hashtags": ["hello", "world"]
    }

  처리:
    1. 이미지 압축 (원본 → 1080p → 썸네일)
    2. S3 업로드
    3. DB 저장
    4. 캐시 무효화
```

#### 메시징
```yaml
GET /api/v1/messages/conversations
  응답:
    {
      "conversations": [
        {
          "user": {...},
          "last_message": {...},
          "unread_count": 3
        }
      ]
    }

GET /api/v1/messages/conversation/:user_id
  응답:
    {
      "messages": [
        {
          "id": "uuid",
          "sender_id": "uuid",
          "content": "Hi",
          "created_at": "..."
        }
      ]
    }

POST /api/v1/messages
  요청:
    {
      "recipient_id": "uuid",
      "content": "Hello",
      "image": "url (optional)"
    }
```

### WebSocket API

#### 실시간 메시징
```javascript
// 연결
const ws = new WebSocket('wss://api.lightsns.com/ws');

// 인증
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token'
}));

// 메시지 전송
ws.send(JSON.stringify({
  type: 'message',
  recipient_id: 'uuid',
  content: 'Hello'
}));

// 메시지 수신
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // { type: 'message', message: {...} }
};
```

### API 최적화

#### 1. 응답 압축
```yaml
알고리즘: Brotli (fallback: Gzip)
압축율:
  - JSON: 70-80%
  - 텍스트: 60-70%

구현:
  - Express compression 미들웨어
  - Content-Encoding: br
```

#### 2. 페이로드 최소화
```yaml
전략:
  - 필요한 필드만 반환
  - 중첩 객체 최소화
  - 타임스탬프 최적화 (Unix timestamp)

예시:
  기존: 2KB
  최적화: 500B (75% 감소)
```

#### 3. 캐싱
```yaml
HTTP 캐싱:
  - ETag
  - Last-Modified
  - Cache-Control

CDN 캐싱:
  - 정적 에셋: 1년
  - 이미지: 30일
  - API 응답: 5분
```

#### 4. Rate Limiting
```yaml
제한:
  - 인증 없음: 10 req/min
  - 일반 사용자: 100 req/min
  - 프리미엄: 500 req/min

구현:
  - Redis 기반
  - Token bucket 알고리즘
```

---

## ⚡ 최적화 전략

### 이미지 최적화

#### 압축 파이프라인
```yaml
업로드 시:
  1. 원본 수신 (최대 10MB)
  2. 검증 (형식, 크기)
  3. 처리:
     a. 고해상도: 1080x1080, WebP, 80 품질 (~200KB)
     b. 썸네일: 320x320, WebP, 70 품질 (~50KB)
     c. 프로필: 150x150, WebP, 70 품질 (~20KB)
  4. S3 업로드
  5. URL 반환

도구:
  - Sharp (Node.js)
  - Lambda@Edge (CDN 최적화)

절감:
  - 원본 5MB → 고해상도 200KB (96% ↓)
  - 피드용 50KB (99% ↓)
```

#### 지연 로딩
```javascript
// React Native
import FastImage from 'react-native-fast-image';

<FastImage
  source={{
    uri: post.thumbnail_url,
    priority: FastImage.priority.normal,
  }}
  resizeMode={FastImage.resizeMode.cover}
  onLoad={() => {
    // 고해상도 로드 (선택적)
    if (isVisible && networkSpeed > 1Mbps) {
      loadHighRes(post.image_url);
    }
  }}
/>
```

### 네트워크 최적화

#### 요청 배칭
```javascript
// 여러 요청을 하나로
// Before
const user = await api.getUser(userId);
const posts = await api.getUserPosts(userId);
const followers = await api.getFollowers(userId);

// After
const { user, posts, followers } = await api.getUserBundle(userId);
```

#### 차등 동기화
```javascript
// 변경된 데이터만 전송
// Last-Modified 기반
const lastSync = localStorage.getItem('lastSync');

const changes = await api.sync({
  since: lastSync,
  types: ['posts', 'messages', 'notifications']
});

// 로컬 DB 업데이트
await db.applyChanges(changes);
localStorage.setItem('lastSync', Date.now());
```

### 오프라인 최적화

#### 로컬 데이터베이스
```javascript
// WatermelonDB 스키마
const postsCollection = {
  name: 'posts',
  columns: [
    { name: 'user_id', type: 'string', isIndexed: true },
    { name: 'content', type: 'string' },
    { name: 'image_url', type: 'string' },
    { name: 'created_at', type: 'number', isIndexed: true },
    { name: 'synced', type: 'boolean' }
  ]
};

// 오프라인 작성
const createPost = async (data) => {
  await db.write(async () => {
    await db.collections.get('posts').create(post => {
      post.content = data.content;
      post.synced = false; // 동기화 대기
    });
  });

  // 큐에 추가
  await syncQueue.add('uploadPost', data);
};

// 온라인 시 자동 동기화
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncQueue.process();
  }
});
```

#### 동기화 큐
```javascript
// Bull Queue
const syncQueue = new Queue('sync', {
  redis: redisConfig
});

syncQueue.process('uploadPost', async (job) => {
  const { postId } = job.data;

  // 로컬 DB에서 가져오기
  const post = await db.get('posts').find(postId);

  // 서버 업로드
  const result = await api.createPost(post);

  // 로컬 DB 업데이트
  await post.update(p => {
    p.id = result.id;
    p.synced = true;
  });
});

// 재시도 전략
syncQueue.on('failed', (job, err) => {
  if (job.attemptsMade < 3) {
    job.retry();
  } else {
    // 사용자에게 알림
    notifyUser('동기화 실패', job.data);
  }
});
```

---

## 🔐 보안 설계

### 인증 & 인가

#### JWT 토큰
```yaml
구조:
  Access Token:
    - 수명: 1시간
    - 페이로드: { user_id, role }

  Refresh Token:
    - 수명: 30일
    - 저장: Redis (블랙리스트 관리)

갱신 플로우:
  1. Access Token 만료
  2. Refresh Token으로 갱신 요청
  3. 새 Access Token 발급
  4. Refresh Token 회전 (선택)
```

#### 비밀번호 암호화
```javascript
const bcrypt = require('bcrypt');

// 회원가입
const hash = await bcrypt.hash(password, 12);
await db.users.create({ password_hash: hash });

// 로그인
const user = await db.users.findByPhone(phone);
const valid = await bcrypt.compare(password, user.password_hash);
```

### 데이터 보호

#### HTTPS
```yaml
설정:
  - TLS 1.3
  - 강력한 암호화 스위트
  - HSTS 헤더
  - Certificate Pinning (앱)
```

#### 입력 검증
```javascript
const { body, validationResult } = require('express-validator');

router.post('/posts',
  body('content').trim().isLength({ min: 1, max: 500 }),
  body('image_url').optional().isURL(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ...
  }
);
```

#### SQL Injection 방지
```javascript
// Parameterized queries
const user = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// ORM 사용 (Sequelize)
const user = await User.findByPk(userId);
```

### 콘텐츠 보안

#### 이미지 업로드
```yaml
검증:
  - 파일 타입: JPEG, PNG, WebP만
  - 파일 크기: 최대 10MB
  - 이미지 차원: 최대 4096x4096
  - 메타데이터 제거 (EXIF)

처리:
  - Sharp로 재인코딩
  - 악성 코드 스캔 (ClamAV)
  - S3 업로드 (private bucket)
  - CloudFront signed URLs
```

#### XSS 방지
```javascript
// 콘텐츠 이스케이프
const escapeHtml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// React Native는 기본적으로 안전
<Text>{post.content}</Text> // 자동 이스케이프
```

---

## ☁️ 인프라 설계

### 환경 구성

```yaml
개발 (Development):
  - 로컬 Docker
  - 개발자 머신
  - Hot reload

스테이징 (Staging):
  - AWS EC2 (t3.medium)
  - RDS (db.t3.small)
  - 프로덕션 미러링

프로덕션 (Production):
  - AWS ECS (Fargate)
  - RDS (db.r5.large)
  - ElastiCache (cache.r5.large)
  - Multi-AZ
  - Auto-scaling
```

### 확장 전략

#### 수평 확장
```yaml
Phase 1 (0-100K users):
  API: 2 인스턴스
  DB: 1 Primary
  Redis: 1 인스턴스

Phase 2 (100K-1M users):
  API: 5-10 인스턴스 (Auto-scaling)
  DB: 1 Primary + 2 Read Replicas
  Redis: 3-node 클러스터

Phase 3 (1M+ users):
  API: 20+ 인스턴스
  DB: Sharding (user_id 기반)
  Redis: Cluster mode
  CDN: 전 세계 POPs
```

#### 데이터베이스 샤딩
```yaml
전략: 사용자 ID 기반 해시

샤드 분배:
  Shard 0: user_id % 4 == 0
  Shard 1: user_id % 4 == 1
  Shard 2: user_id % 4 == 2
  Shard 3: user_id % 4 == 3

라우팅:
  const shard = getUserShard(userId);
  const db = dbConnections[shard];
```

---

## 📊 모니터링 & 로깅

### 애플리케이션 모니터링

#### Sentry
```javascript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "...",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// 에러 추적
try {
  await api.createPost(data);
} catch (error) {
  Sentry.captureException(error);
}
```

#### 성능 모니터링
```yaml
측정 지표:
  - API 응답 시간
  - 앱 시작 시간
  - 화면 전환 시간
  - 메모리 사용량
  - 네트워크 요청

목표:
  - API P95: <500ms
  - 앱 시작: <2초
  - 화면 전환: <300ms
```

### 로깅

#### 구조화된 로그
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

logger.info('User created', {
  user_id: user.id,
  username: user.username,
  timestamp: Date.now()
});
```

---

## 🧪 테스트 전략

### 테스트 피라미드
```
       /\
      /E2E\      ← 10% (중요 플로우)
     /──────\
    /  통합   \   ← 30% (API, 통합)
   /──────────\
  /    단위     \ ← 60% (함수, 컴포넌트)
 /──────────────\
```

### 단위 테스트
```javascript
// Jest
describe('Post Service', () => {
  test('creates post with valid data', async () => {
    const data = {
      user_id: 'uuid',
      content: 'Hello world'
    };

    const post = await PostService.create(data);

    expect(post).toHaveProperty('id');
    expect(post.content).toBe('Hello world');
  });
});
```

### 통합 테스트
```javascript
// Supertest
describe('POST /api/v1/posts', () => {
  test('creates post', async () => {
    const response = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Test' })
      .expect(201);

    expect(response.body.post).toHaveProperty('id');
  });
});
```

---

## 📈 성능 목표

```yaml
앱 크기:
  목표: <20MB
  측정: 빌드 분석

로딩 시간:
  초기: <2초
  페이지 전환: <300ms
  측정: Performance API

데이터 사용:
  일일: <3MB
  월간: <50MB
  측정: 네트워크 모니터

안정성:
  충돌률: <0.5%
  에러율: <1%
  가동 시간: >99.9%
```

---

**문서 승인:**
- [ ] CTO
- [ ] 시니어 개발자
- [ ] DevOps 리드

**관련 문서:**
- ← [Project Roadmap](../project-plan/2_project_roadmap.md)
- → [Comprehensive Report](../reports/4_comprehensive_report_summary.md)

---

**© 2025 ULTRATHINK. All Rights Reserved.**
