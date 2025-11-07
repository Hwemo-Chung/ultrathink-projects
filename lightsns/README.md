# LightSNS - 저속 인터넷 최적화 SNS 플랫폼

**상태:** ✅ MVP 완료 (Phase 1 Complete)
**시작일:** 2025-10-27
**완료일:** 2025-10-28
**버전:** 1.0.0

## 🎯 프로젝트 개요

LightSNS는 전 세계 22억 명의 저속 인터넷 사용자를 위한 초경량, 초고속 소셜 네트워크 플랫폼입니다.

### 핵심 목표
- **앱 크기:** 15MB (기존 SNS 대비 94% 감소)
- **로딩 시간:** 2-3초 @ 1Mbps
- **데이터 사용:** 월 10-30MB (90% 절감)
- **오프라인 모드:** 완전 지원

## 📁 프로젝트 구조

```
lightsns/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── config/      # 설정 (DB, Redis)
│   │   ├── middleware/  # Express 미들웨어
│   │   ├── utils/       # 유틸리티 (Logger)
│   │   └── index.js     # 진입점
│   ├── database/
│   │   └── migrations/  # SQL 마이그레이션
│   ├── Dockerfile
│   └── package.json
│
├── mobile/              # React Native 앱
│   ├── src/
│   └── package.json
│
└── infrastructure/      # Docker & 인프라
    └── docker/
        └── docker-compose.yml
```

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18+
- Docker & Docker Compose
- (모바일) React Native 개발 환경

### 1. 저장소 클론

```bash
git clone <repository-url>
cd ultrathink-projects/lightsns
```

### 2. 환경 변수 설정

```bash
cd backend
cp .env.example .env
# .env 파일 수정 (필요시)
```

### 3. Docker로 개발 환경 실행

```bash
cd infrastructure/docker
docker-compose up -d
```

이 명령어는 다음을 실행합니다:
- PostgreSQL (포트 5432)
- Redis (포트 6379)
- Backend API (포트 3000)

### 4. 헬스 체크

```bash
# API 서버 확인
curl http://localhost:3000/health

# 데이터베이스 확인
docker exec lightsns-postgres psql -U postgres -c "SELECT version();"

# Redis 확인
docker exec lightsns-redis redis-cli ping
```

### 5. 로컬 개발 (Docker 없이)

#### Backend

```bash
cd backend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# 개발 서버 시작
npm run dev
```

#### Mobile (준비 중)

```bash
cd mobile

# 의존성 설치
npm install

# Metro 시작
npm start

# Android 실행 (별도 터미널)
npm run android

# iOS 실행 (Mac only)
npm run ios
```

## 📊 개발 진행 상황

### Phase 0: 준비 단계 ✅ 완료

- [x] 프로젝트 구조 생성
- [x] Backend 기본 설정
  - [x] Express 서버
  - [x] PostgreSQL 연결
  - [x] Redis 캐싱
  - [x] 로깅 시스템
  - [x] 에러 핸들링
- [x] Docker 개발 환경
- [x] 데이터베이스 스키마
- [x] CI/CD 파이프라인
  - [x] GitHub Actions 워크플로우
  - [x] 자동화 테스트 (CI)
  - [x] Docker 빌드 및 배포
  - [x] 릴리스 자동화
- [ ] Frontend 기본 설정

### Phase 1: MVP 개발 ✅ 완료

#### Sprint 1: 인증 시스템 ✅ 완료 (Week 1)
- [x] 사용자 인증 API
  - [x] 회원가입 (POST /api/v1/auth/register)
  - [x] 로그인 (POST /api/v1/auth/login)
  - [x] 토큰 갱신 (POST /api/v1/auth/refresh)
  - [x] 로그아웃 (POST /api/v1/auth/logout)
- [x] 프로필 관리
  - [x] 프로필 조회 (GET /api/v1/auth/me)
  - [x] 프로필 수정 (PATCH /api/v1/auth/me)
  - [x] 프로필 이미지 업로드 (POST /api/v1/auth/me/avatar)
  - [x] 프로필 이미지 삭제 (DELETE /api/v1/auth/me/avatar)
- [x] JWT 토큰 시스템
  - [x] Access/Refresh 토큰
  - [x] Token blacklist (logout)
  - [x] 인증 미들웨어
- [x] 이미지 처리
  - [x] Multer 파일 업로드
  - [x] Sharp 이미지 압축 (WebP, 90% 절감)
  - [x] 썸네일 자동 생성

#### Sprint 2: 게시물 시스템 ✅ 완료 (Week 2)
- [x] 게시물 CRUD API
  - [x] 게시물 생성 (POST /api/v1/posts)
  - [x] 게시물 조회 (GET /api/v1/posts/:id)
  - [x] 사용자 게시물 목록 (GET /api/v1/posts/user/:userId)
  - [x] 게시물 수정 (PATCH /api/v1/posts/:id)
  - [x] 게시물 삭제 (DELETE /api/v1/posts/:id)
- [x] 피드 시스템
  - [x] 타임라인 피드 (GET /api/v1/posts/feed)
  - [x] 커서 기반 페이지네이션
  - [x] 팔로잉 사용자 게시물
- [x] 좋아요 기능
  - [x] 좋아요/취소 (POST/DELETE /api/v1/posts/:id/like)
  - [x] 좋아요 사용자 목록 (GET /api/v1/posts/:id/likes)
- [x] 댓글 시스템
  - [x] 댓글 작성 (POST /api/v1/posts/:id/comments)
  - [x] 댓글 목록 (GET /api/v1/posts/:id/comments)
  - [x] 대댓글 (replies)
  - [x] 댓글 삭제 (DELETE /api/v1/posts/comments/:commentId)
- [x] 해시태그
  - [x] 자동 추출
  - [x] 해시태그 검색 (GET /api/v1/posts/hashtag/:hashtag)
- [x] 이미지 처리
  - [x] 게시물 이미지 업로드
  - [x] WebP 변환 및 압축

#### Sprint 3: 팔로우 시스템 ✅ 완료 (Week 3)
- [x] 팔로우 관계 관리
  - [x] 팔로우/언팔로우 (POST/DELETE /api/v1/follows/:userId)
  - [x] 팔로워 목록 (GET /api/v1/follows/:userId/followers)
  - [x] 팔로잉 목록 (GET /api/v1/follows/:userId/following)
  - [x] 맞팔로우 목록 (GET /api/v1/follows/:userId/mutual)
  - [x] 팔로우 제안 (GET /api/v1/follows/suggestions)
  - [x] 팔로워 제거 (DELETE /api/v1/follows/:userId/followers/:followerId)
  - [x] 팔로우 상태 확인 (GET /api/v1/follows/:userId/status)
- [x] 사용자 프로필 API
  - [x] 공개 프로필 조회 (GET /api/v1/users/:userId)
  - [x] 사용자명으로 조회 (GET /api/v1/users/username/:username)
  - [x] 사용자 검색 (GET /api/v1/users/search)
  - [x] 사용자 통계 (GET /api/v1/users/:userId/stats)
  - [x] 인기 사용자 (GET /api/v1/users/popular)
- [x] 팔로우 알고리즘
  - [x] 맞팔 기반 추천
  - [x] 인기도 기반 추천
  - [x] Redis 캐싱 최적화

#### Sprint 4: 메시징 시스템 ✅ 완료 (Week 4)
- [x] 1:1 다이렉트 메시징
  - [x] 메시지 전송 (POST /api/v1/messages)
  - [x] 대화 목록 (GET /api/v1/messages/conversations)
  - [x] 특정 대화 내역 (GET /api/v1/messages/conversations/:userId)
  - [x] 메시지 검색 (GET /api/v1/messages/search/:userId)
  - [x] 메시지 삭제 (DELETE /api/v1/messages/:messageId)
- [x] 읽음 확인 (Read Receipts)
  - [x] 메시지 읽음 처리 (POST /api/v1/messages/:messageId/read)
  - [x] 대화 전체 읽음 처리 (POST /api/v1/messages/:userId/read)
  - [x] 읽지 않은 메시지 수 (GET /api/v1/messages/unread)
  - [x] 대화별 읽지 않은 수 (GET /api/v1/messages/unread/:userId)
- [x] 실시간 메시징 (WebSocket/Socket.io)
  - [x] 실시간 메시지 전송/수신
  - [x] 타이핑 표시 (typing indicators)
  - [x] 실시간 읽음 확인
  - [x] 온라인/오프라인 상태
  - [x] JWT 인증 기반 연결
- [x] 캐싱 및 최적화
  - [x] 대화 목록 Redis 캐싱 (1분)
  - [x] 대화 내역 캐싱 (3분)
  - [x] 읽지 않은 수 캐싱 (30초)

#### Sprint 5: 알림 시스템 ✅ 완료 (Week 5)
- [x] 알림 모델 및 타입
  - [x] 좋아요 알림 (like)
  - [x] 댓글 알림 (comment)
  - [x] 대댓글 알림 (reply)
  - [x] 팔로우 알림 (follow)
  - [x] 메시지 알림 (message)
  - [x] 멘션 알림 (mention)
- [x] 알림 API
  - [x] 알림 목록 조회 (GET /api/v1/notifications)
  - [x] 읽지 않은 알림 수 (GET /api/v1/notifications/unread/count)
  - [x] 알림 읽음 처리 (POST /api/v1/notifications/:id/read)
  - [x] 전체 읽음 처리 (POST /api/v1/notifications/read-all)
  - [x] 알림 삭제 (DELETE /api/v1/notifications/:id)
  - [x] 전체 삭제 (DELETE /api/v1/notifications)
- [x] 실시간 알림 (WebSocket)
  - [x] 실시간 알림 푸시
  - [x] 알림 배지 카운트
  - [x] 중복 알림 방지 (24시간)
- [x] 캐싱 및 최적화
  - [x] 알림 목록 캐싱 (1분)
  - [x] 읽지 않은 수 캐싱 (30초)

#### Integration Phase: 알림 시스템 통합 ✅ 완료 (Week 5)
- [x] 기존 기능과 알림 통합
  - [x] 게시물 좋아요 시 알림 전송
  - [x] 댓글 작성 시 알림 전송 (게시물 작성자에게)
  - [x] 대댓글 작성 시 알림 전송 (댓글 작성자에게)
  - [x] 팔로우 시 알림 전송
  - [x] 메시지 전송 시 알림 전송
- [x] 실시간 전송
  - [x] Socket.io 통합으로 즉시 푸시
  - [x] 오프라인 사용자는 다음 로그인 시 확인
- [x] 중복 방지 로직
  - [x] 24시간 내 동일 알림 방지
  - [x] 자기 자신 알림 방지
- [x] 프로덕션 준비
  - [x] 에러 처리 및 로깅
  - [x] Redis 캐시 무효화

#### Sprint 6+: 추가 기능 (향후 개발)
- [ ] 그룹 채팅
- [ ] 미디어 메시지 (이미지, 비디오)
- [ ] 스토리 기능
- [ ] 고급 알림 설정 (알림 끄기/켜기)
- [ ] 푸시 알림 (FCM/APNS)

## 🔧 기술 스택

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express 4.x
- **Database:** PostgreSQL 14
- **Cache:** Redis 7
- **Auth:** JWT
- **Image Processing:** Sharp
- **WebSocket:** Socket.io
- **Queue:** Bull

### Frontend (Mobile)
- **Framework:** React Native 0.72+
- **State Management:** Redux Toolkit
- **Data Fetching:** React Query
- **Local DB:** WatermelonDB
- **Images:** Fast Image
- **Storage:** AsyncStorage

### Infrastructure
- **Container:** Docker
- **Cloud:** AWS (예정)
- **CDN:** CloudFlare (예정)
- **CI/CD:** GitHub Actions (예정)

## 📖 API 문서

### 기본 정보

- **Base URL:** `http://localhost:3000/api/v1`
- **인증:** Bearer Token (JWT)

### 엔드포인트

#### Health Check
```
GET /health
```

#### 인증 API (✅ 완료)
```
POST   /api/v1/auth/register          회원가입
POST   /api/v1/auth/login             로그인
POST   /api/v1/auth/refresh           토큰 갱신
POST   /api/v1/auth/logout            로그아웃
GET    /api/v1/auth/me                현재 사용자 조회
PATCH  /api/v1/auth/me                프로필 수정
POST   /api/v1/auth/me/avatar         프로필 이미지 업로드
DELETE /api/v1/auth/me/avatar         프로필 이미지 삭제
```

#### 게시물 API (✅ 완료)
```
POST   /api/v1/posts                  게시물 생성
GET    /api/v1/posts/:id              게시물 조회
GET    /api/v1/posts/feed             피드 조회
GET    /api/v1/posts/user/:userId     사용자 게시물
PATCH  /api/v1/posts/:id              게시물 수정
DELETE /api/v1/posts/:id              게시물 삭제

POST   /api/v1/posts/:id/like         좋아요
DELETE /api/v1/posts/:id/like         좋아요 취소
GET    /api/v1/posts/:id/likes        좋아요 목록

POST   /api/v1/posts/:id/comments     댓글 작성
GET    /api/v1/posts/:id/comments     댓글 목록
GET    /api/v1/posts/comments/:id/replies  대댓글 조회
DELETE /api/v1/posts/comments/:id    댓글 삭제

GET    /api/v1/posts/hashtag/:tag     해시태그 검색
```

#### 팔로우 API (✅ 완료)
```
POST   /api/v1/follows/:userId               팔로우
DELETE /api/v1/follows/:userId               언팔로우
GET    /api/v1/follows/:userId/followers     팔로워 목록
GET    /api/v1/follows/:userId/following     팔로잉 목록
GET    /api/v1/follows/:userId/mutual        맞팔로우 목록
GET    /api/v1/follows/:userId/status        팔로우 상태 확인
GET    /api/v1/follows/suggestions           팔로우 추천
DELETE /api/v1/follows/:userId/followers/:followerId  팔로워 제거
```

#### 사용자 API (✅ 완료)
```
GET    /api/v1/users/:userId                 공개 프로필 조회
GET    /api/v1/users/username/:username      사용자명으로 조회
GET    /api/v1/users/search?q=query          사용자 검색
GET    /api/v1/users/:userId/stats           사용자 통계
GET    /api/v1/users/popular                 인기 사용자
```

#### 메시징 API (✅ 완료)
```
POST   /api/v1/messages                      메시지 전송
GET    /api/v1/messages/conversations        대화 목록
GET    /api/v1/messages/conversations/:userId  특정 대화 내역
GET    /api/v1/messages/search/:userId       대화 내 메시지 검색
DELETE /api/v1/messages/:messageId           메시지 삭제

GET    /api/v1/messages/unread               전체 읽지 않은 수
GET    /api/v1/messages/unread/:userId       대화별 읽지 않은 수
POST   /api/v1/messages/:messageId/read      메시지 읽음 처리
POST   /api/v1/messages/:userId/read         대화 전체 읽음 처리
```

#### 알림 API (✅ 완료)
```
GET    /api/v1/notifications                 알림 목록 조회
GET    /api/v1/notifications/unread/count    읽지 않은 알림 수
POST   /api/v1/notifications/:id/read        알림 읽음 처리
POST   /api/v1/notifications/read-all        전체 읽음 처리
DELETE /api/v1/notifications/:id             알림 삭제
DELETE /api/v1/notifications                 전체 알림 삭제
```

#### WebSocket 이벤트 (✅ 완료)
```
// 클라이언트 → 서버
message:send              메시지 전송
typing:start              타이핑 시작
typing:stop               타이핑 중지
message:read              메시지 읽음
conversation:read         대화 읽음

// 서버 → 클라이언트
message:received          메시지 수신
message:read              읽음 확인
conversation:read         대화 읽음 확인
typing:start              상대방 타이핑 시작
typing:stop               상대방 타이핑 중지
user:online               사용자 온라인
user:offline              사용자 오프라인
users:online              온라인 사용자 목록
notification:new          새 알림 수신
```

**예시 - 회원가입:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "display_name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

**예시 - 프로필 이미지 업로드:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/me/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@profile.jpg"
```

*(더 많은 엔드포인트는 개발 중)*

## 🧪 테스트

```bash
# Backend 테스트
cd backend
npm test

# 커버리지 포함
npm test -- --coverage

# 단위 테스트만
npm run test:unit

# 통합 테스트만
npm run test:integration

# Mobile 테스트 (준비 중)
cd mobile
npm test
```

## 🔄 CI/CD 파이프라인

프로젝트는 GitHub Actions를 사용한 완전 자동화된 CI/CD 파이프라인을 갖추고 있습니다.

### 워크플로우

#### 1. Continuous Integration (CI)
- **트리거:** 모든 푸시 및 PR
- **기능:** 빠른 테스트, 문서 검증, 빌드 확인
- **실행 시간:** ~3-5분

#### 2. Backend Tests
- **트리거:** Backend 코드 변경 시
- **기능:** 전체 테스트 스위트, 커버리지 리포트, 보안 감사
- **Node 버전:** 18.x, 20.x (매트릭스 테스트)
- **실행 시간:** ~5-8분

#### 3. Docker Build
- **트리거:** main/develop 브랜치 푸시, 태그
- **기능:** Docker 이미지 빌드, GHCR 배포, Docker Compose 테스트
- **실행 시간:** ~4-6분

#### 4. Release
- **트리거:** 버전 태그 (v*.*.*)
- **기능:** 자동 릴리스 생성, 체인지로그, Docker 이미지 배포
- **실행 시간:** ~8-10분

### 상태 뱃지

워크플로우 상태는 GitHub Actions 탭에서 확인 가능합니다.

### 사용 방법

```bash
# 릴리스 생성
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Pre-release 생성
git tag -a v1.1.0-beta.1 -m "Beta release"
git push origin v1.1.0-beta.1
```

자세한 내용은 [CI/CD 문서](../.github/workflows/README.md)를 참조하세요.

## 📝 개발 가이드

### 코딩 스타일

- **JavaScript:** ES6+ 모던 문법 사용
- **Linting:** ESLint 준수
- **Formatting:** Prettier 사용
- **Commits:** Conventional Commits

### 브랜치 전략

- `main` - 프로덕션 준비 코드
- `develop` - 개발 브랜치
- `feature/*` - 새 기능
- `bugfix/*` - 버그 수정
- `hotfix/*` - 긴급 수정

### 커밋 메시지

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 변경
style: 코드 포맷팅
refactor: 리팩토링
test: 테스트 추가/수정
chore: 빌드/설정 변경
```

## 🗂️ 관련 문서

### 프로젝트 문서
- **[README.md](README.md)** - 이 파일, 빠른 시작 가이드
- **[FEATURES.md](FEATURES.md)** - 전체 기능 개요
- **[API_REFERENCE.md](API_REFERENCE.md)** - 완전한 API 문서 (50 엔드포인트)
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - 프로덕션 배포 가이드
- **[PROJECT_COMPLETION.md](PROJECT_COMPLETION.md)** - 프로젝트 완성 보고서
- **[Testing Guide](backend/__tests__/README.md)** - 테스트 문서

### CI/CD 문서
- **[Workflows README](../.github/workflows/README.md)** - GitHub Actions 워크플로우 가이드
- **[CI Workflow](../.github/workflows/ci.yml)** - 지속적 통합
- **[Backend Tests](../.github/workflows/backend-test.yml)** - 백엔드 테스트
- **[Docker Build](../.github/workflows/docker-build.yml)** - Docker 빌드
- **[Release](../.github/workflows/release.yml)** - 릴리스 자동화

### 기획 문서
프로젝트 기획 및 설계 문서는 `lightsns-research/` 디렉토리에 있습니다:

1. [README.md](../lightsns-research/README.md) - 프로젝트 개요
2. [COMPLETION_REPORT.md](../lightsns-research/COMPLETION_REPORT.md) - 완성 보고서
3. [Executive Summary](../lightsns-research/docs/prd/1_executive_summary.md) - PRD
4. [Project Roadmap](../lightsns-research/docs/project-plan/2_project_roadmap.md) - 로드맵
5. [Technical Design](../lightsns-research/docs/technical/3_technical_design.md) - 기술 설계
6. [Comprehensive Report](../lightsns-research/docs/reports/4_comprehensive_report_summary.md) - 종합 보고서

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 👥 팀

**ULTRATHINK Team**
- 프로젝트 리드: [Your Name]
- 기술 리드: TBD
- 제품 매니저: TBD

## 📞 연락처

- **이슈:** [GitHub Issues](../../issues)
- **이메일:** dev@lightsns.com
- **문서:** [프로젝트 위키](../../wiki)

---

**© 2025 ULTRATHINK. All Rights Reserved.**

Made with ❤️ for 2.2B people in low-bandwidth environments
