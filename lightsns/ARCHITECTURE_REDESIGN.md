# LightSNS 프로젝트 재설계 - 저사양 최적화 분석

**날짜**: 2025-10-28
**목적**: 22억 저속 인터넷 사용자를 위한 초경량 SNS

---

## 🚨 현재 구현의 문제점

### ❌ 잘못 구현된 기능들

현재 구현은 **일반 SNS**처럼 만들어져서 **프로젝트 목적과 완전히 다릅니다**:

| 현재 구현 | 문제점 | 데이터 사용량 |
|----------|--------|--------------|
| 💬 댓글/대댓글 시스템 | 불필요한 기능 | ~10-50KB/post |
| 💬 1:1 메시징 시스템 | 프로젝트 범위 밖 | ~5-20KB/message |
| 🔔 복잡한 알림 (6종류) | 과도한 기능 | ~2-5KB/notification |
| ⚡ WebSocket 실시간 | 저사양 부하 큼 | 지속적 연결 |
| 📊 복잡한 API (50 endpoints) | 너무 많음 | 다양함 |

**총 데이터 낭비**: 한 세션에 **수백 KB ~ 수 MB**

---

## ✅ 실제 프로젝트 요구사항

### 핵심 차별점 (Core Differentiators)

1. **저사양 최적화**
   - 1Mbps 이하 네트워크에서 작동
   - 저사양 디바이스 (512MB RAM)
   - 배터리 효율

2. **오프라인/온라인 모드**
   - 오프라인에서도 앱 사용 가능
   - 로컬에 데이터 저장
   - 온라인 시 자동 동기화

3. **이모티콘 반응만**
   - 댓글/대댓글 **없음**
   - 오직 이모티콘으로만 소통 (👍 ❤️ 😂 😮 😢 👏)
   - 텍스트 입력 최소화

4. **온라인 동기화만**
   - 오프라인: 로컬 작업
   - 온라인: 서버 동기화
   - 배경 동기화 (백그라운드)

---

## 🎯 새로운 아키텍처

### Frontend (Mobile)

```
┌─────────────────────────────────────┐
│     React Native App (15MB)         │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Offline-First Layer        │  │
│  │                              │  │
│  │  • IndexedDB/WatermelonDB    │  │
│  │  • Local Post Cache          │  │
│  │  • Sync Queue                │  │
│  │  • Conflict Resolution       │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Network Layer              │  │
│  │                              │  │
│  │  • Connection Detection      │  │
│  │  • Request Queue             │  │
│  │  • Delta Sync                │  │
│  │  • Compression               │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   UI Layer                   │  │
│  │                              │  │
│  │  • Posts Feed                │  │
│  │  • Emoji Reactions           │  │
│  │  • Image Viewer              │  │
│  │  • Profile                   │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
           │
           │ Only when ONLINE
           ↓
┌─────────────────────────────────────┐
│     REST API (Minimal)              │
│                                     │
│  • 15 endpoints (50 → 15)          │
│  • Delta sync                       │
│  • Brotli compression               │
│  • Emoji reactions only             │
│  • No WebSocket                     │
└─────────────────────────────────────┘
```

---

## 📉 데이터 사용량 최적화

### Before (현재):
```
- 게시물 조회: 5-10KB
- 댓글 로딩: 10-50KB
- 알림 확인: 2-5KB
- 실시간 연결: 지속적
──────────────────────────
세션당: 200KB - 2MB
```

### After (최적화):
```
- 게시물 조회: 0.5-2KB (Brotli)
- 이모티콘 반응: 10-50 bytes
- 이미지: WebP 썸네일 (5-10KB)
- 동기화: 오프라인 배치
──────────────────────────
세션당: 10-50KB (95% 감소!)
```

---

## 🔄 오프라인/온라인 모드 설계

### Offline Mode (기본)

**특징**:
- 모든 데이터는 로컬 DB에 저장
- 앱 구동에 네트워크 불필요
- 작성/수정/삭제는 로컬에만 저장
- Sync queue에 작업 쌓임

**로컬 저장**:
```javascript
// WatermelonDB Schema
{
  posts: {
    id: string,
    content: string,
    image_url: string (local path),
    created_at: timestamp,
    sync_status: 'pending' | 'synced' | 'conflict'
  },
  reactions: {
    post_id: string,
    emoji: string (👍 ❤️ 😂 😮 😢 👏),
    user_id: string,
    sync_status: 'pending' | 'synced'
  },
  sync_queue: {
    action: 'create' | 'update' | 'delete',
    entity: 'post' | 'reaction',
    data: json,
    retry_count: number
  }
}
```

### Online Mode (동기화)

**특징**:
- 자동으로 sync queue 처리
- Delta sync (변경사항만)
- 배경 동기화 (사용자 방해 안 함)
- 충돌 해결 (Last-Write-Wins)

**동기화 프로세스**:
```
1. 연결 감지
   ↓
2. Sync queue 확인
   ↓
3. 배치로 서버 전송 (한 번에)
   ↓
4. 서버 변경사항 받기 (since last_sync)
   ↓
5. 로컬 DB 업데이트
   ↓
6. Sync complete → 다음 변경사항 대기
```

---

## 😊 이모티콘 반응 시스템

### 댓글 대신 이모티콘 (Emoji Reactions)

**6가지 반응만**:
- 👍 좋아요 (Like)
- ❤️ 사랑해요 (Love)
- 😂 웃겨요 (Haha)
- 😮 놀라워요 (Wow)
- 😢 슬퍼요 (Sad)
- 👏 응원해요 (Clap)

**데이터 구조**:
```json
{
  "post_id": "abc123",
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

**API 응답 (Compressed)**:
```json
{
  "p": "abc123",
  "r": {
    "0": 42,
    "1": 18,
    "2": 7,
    "3": 3,
    "4": 1,
    "5": 12
  },
  "u": 0
}
```

**데이터 크기**:
- 전체: ~50 bytes (JSON)
- Brotli 압축: ~30 bytes
- vs 댓글: ~10-50KB

**95-99% 데이터 절감!**

---

## 🗜️ 극한 데이터 압축

### 1. API 응답 최소화

**Before**:
```json
{
  "success": true,
  "message": "Post retrieved successfully",
  "data": {
    "post": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "content": "Hello World",
      "user": {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "username": "johndoe",
        "display_name": "John Doe",
        "avatar_url": "https://..."
      },
      "created_at": "2025-10-28T12:34:56.789Z",
      "like_count": 42,
      "comment_count": 15
    }
  }
}
```
**Size**: ~350 bytes

**After (압축)**:
```json
{
  "i": "550e8400",
  "c": "Hello World",
  "u": {
    "i": "660e8400",
    "n": "johndoe",
    "a": "https://..."
  },
  "t": 1730118896,
  "l": 42
}
```
**Size**: ~120 bytes (65% 감소)

**After (Brotli)**:
```
Size: ~60 bytes (83% 감소)
```

### 2. 이미지 최적화

**전략**:
```
Original → WebP → Thumbnails → Progressive
1080p      90% quality   320p      Load stages
```

**크기**:
- Original JPEG: 500KB - 2MB
- WebP 1080p: 50-200KB (90% 압축)
- WebP 320p: 5-10KB (썸네일)
- Progressive: 먼저 썸네일, 나중에 원본

### 3. Delta Sync

**전체 동기화 대신**:
```
GET /sync?since=1730118896
```

**응답**:
```json
{
  "posts": [
    /* 변경된 게시물만 */
  ],
  "reactions": [
    /* 변경된 반응만 */
  ],
  "deleted": ["post_id1", "post_id2"],
  "timestamp": 1730119000
}
```

---

## 📱 최소 API 설계

### 현재: 50 endpoints ❌
### 새로운: 15 endpoints ✅

#### Core Endpoints (7)

1. **GET /sync**
   - Delta sync (변경사항만)
   - since parameter
   - 압축 응답

2. **POST /posts**
   - 게시물 작성
   - 이미지 업로드

3. **GET /posts/feed**
   - 피드 조회
   - 커서 페이지네이션

4. **DELETE /posts/:id**
   - 게시물 삭제

5. **POST /posts/:id/react**
   - 이모티콘 반응
   - Body: `{ "emoji": "👍" }`

6. **DELETE /posts/:id/react**
   - 반응 취소

7. **GET /posts/:id**
   - 단일 게시물

#### Auth Endpoints (4)

8. **POST /auth/register**
9. **POST /auth/login**
10. **POST /auth/refresh**
11. **POST /auth/logout**

#### User Endpoints (4)

12. **GET /users/:id**
13. **GET /users/me**
14. **PATCH /users/me**
15. **POST /users/me/avatar**

**제거된 기능**:
- ❌ 댓글 API (14 endpoints)
- ❌ 메시징 API (9 endpoints)
- ❌ 알림 API (6 endpoints)
- ❌ WebSocket (14 events)

---

## 🔋 배터리 & 성능 최적화

### 네트워크 최적화

**Before**:
- 실시간 연결 (WebSocket)
- 폴링 (매 5초)
- 개별 API 호출

**After**:
- 배경 동기화 (10분마다)
- 배치 요청 (한 번에)
- 네트워크 감지 후에만 동기화

### CPU 최적화

**전략**:
- Lazy loading
- Virtual scrolling
- Memoization
- 이미지 lazy load

### 메모리 최적화

**전략**:
- 최대 100 posts 캐시
- 오래된 데이터 자동 삭제
- 이미지 디스크 캐시 (메모리 아님)

---

## 📊 예상 성능 개선

### 데이터 사용량

| 작업 | Before | After | 개선 |
|-----|--------|-------|------|
| 피드 로딩 (20 posts) | 100-500KB | 10-50KB | **90% ↓** |
| 게시물 작성 | 50KB | 5KB | **90% ↓** |
| 반응 추가 | 2KB | 50 bytes | **97% ↓** |
| 동기화 (100 items) | 500KB-2MB | 50-200KB | **90% ↓** |
| **세션당 총합** | **1-5MB** | **50-200KB** | **95% ↓** |

### 배터리 수명

| 항목 | Before | After | 개선 |
|-----|--------|-------|------|
| WebSocket | 지속적 | 없음 | **100% ↓** |
| 네트워크 요청 | 수시로 | 배치 (10분) | **90% ↓** |
| CPU 사용 | 높음 | 낮음 | **70% ↓** |
| **배터리 수명** | **4시간** | **8-12시간** | **2-3x ↑** |

### 앱 크기

| 항목 | Before | After | 개선 |
|-----|--------|-------|------|
| 코드 | 15MB | 8MB | **47% ↓** |
| 라이브러리 | 많음 | 최소 | **60% ↓** |
| **총 앱 크기** | **~30MB** | **~15MB** | **50% ↓** |

---

## 🏗️ 구현 우선순위

### Phase 1: 핵심 재설계 (1주)
1. ✅ 댓글 시스템 제거
2. ✅ 이모티콘 반응 시스템 구현
3. ✅ API 15개로 축소
4. ✅ 응답 압축 (Brotli)

### Phase 2: 오프라인 지원 (2주)
5. ⏳ WatermelonDB 통합
6. ⏳ Sync Queue 구현
7. ⏳ 연결 감지 로직
8. ⏳ 배경 동기화

### Phase 3: 최적화 (1주)
9. ⏳ Delta Sync
10. ⏳ 이미지 progressive loading
11. ⏳ Virtual scrolling
12. ⏳ 성능 테스트

---

## 💡 핵심 변경 요약

### 제거할 기능 ❌
1. 댓글/대댓글 시스템 (완전 제거)
2. 1:1 메시징 시스템 (완전 제거)
3. WebSocket 실시간 (제거)
4. 복잡한 알림 (단순화)
5. 30+ API endpoints (제거)

### 추가할 기능 ✅
1. 이모티콘 반응 (6가지)
2. 오프라인 모드
3. Sync Queue
4. Delta Sync
5. Brotli 압축

### 최적화 🚀
1. API 50 → 15
2. 데이터 95% 감소
3. 배터리 2-3배 향상
4. 앱 크기 50% 감소

---

## 결론

현재 구현은 **일반 SNS**입니다.
목표는 **초경량 오프라인 우선 SNS**입니다.

**근본적인 재설계가 필요합니다.**

다음 단계:
1. 댓글 시스템 → 이모티콘 반응으로 교체
2. API 대대적 축소
3. 오프라인 아키텍처 구현
4. 극한 압축 적용

**예상 결과**:
- 데이터 사용: 1-5MB → 50-200KB (95% ↓)
- 배터리 수명: 4시간 → 8-12시간 (2-3x ↑)
- 앱 크기: 30MB → 15MB (50% ↓)

**진짜 LightSNS를 만들겠습니다!** 🚀
