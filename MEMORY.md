# Pet to You API — 프로젝트 메모리

> **마지막 업데이트**: 2026-02-26
> **레포**: https://github.com/ddalgiwuu/pet-to-you-api
> **연관 프론트엔드**: https://github.com/ddalgiwuu/pet-to-you-web

---

## 프로젝트 개요

Pet to You 플랫폼 백엔드 API 서버.
동물병원·미용·호텔·입양·보험·결제·커뮤니티 등 전 도메인 REST API 제공.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| Framework | NestJS + TypeScript |
| ORM | TypeORM (PostgreSQL) |
| NoSQL | Mongoose (MongoDB) |
| Auth | JWT RS256 (RSA key pair), Passport.js |
| OAuth | Kakao / Naver / Apple |
| Cache | Redis (CacheModule) |
| Encrypt | EncryptionService (AES + HMAC) |
| Audit | AuditService (감사 로그) |
| Rate Limit | @nestjs/throttler |
| Docs | Swagger (OpenAPI) |
| 포트 | 3000 (기본) |

---

## 프로젝트 구조

```
pet-to-you-api/
├── src/
│   ├── app.module.ts              # 루트 모듈
│   ├── main.ts                    # 앱 부트스트랩
│   ├── core/                      # 인프라 코어 모듈
│   │   ├── auth/                  # 인증 (JWT, OAuth, guards, decorators)
│   │   │   ├── controllers/auth.controller.ts
│   │   │   ├── services/auth.service.ts
│   │   │   ├── guards/            # JwtAuthGuard, RolesGuard, PermissionsGuard
│   │   │   ├── decorators/        # @CurrentUser, @Public, @Roles
│   │   │   ├── strategies/        # jwt, jwt-refresh, kakao, naver, apple
│   │   │   └── dto/               # RegisterDto, LoginDto, ChangePasswordDto 등
│   │   ├── database/              # TypeORM + Mongoose 설정
│   │   ├── encryption/            # AES 암호화, HMAC 인덱스
│   │   ├── cache/                 # Redis 캐시
│   │   ├── audit/                 # 감사 로그
│   │   ├── logger/                # 커스텀 로거
│   │   └── security/              # 보안 헤더 등
│   └── modules/                   # 도메인 모듈
│       ├── users/                 # 사용자 프로필 (구현 완료)
│       ├── pets/                  # 반려동물
│       ├── hospitals/             # 동물병원
│       ├── booking/               # 예약
│       ├── medical-records/       # 진료 기록
│       ├── daycare/               # 유치원
│       ├── adoption/              # 입양
│       ├── insurance/             # 보험
│       ├── payments/              # 결제
│       ├── community/             # 커뮤니티
│       ├── notifications/         # 알림
│       ├── compliance/            # PIPA 컴플라이언스
│       ├── analytics/             # 분석
│       ├── bff/                   # BFF (Backend for Frontend)
│       └── dashboard/             # 대시보드
├── keys/
│   ├── jwt.key                    # RSA 개인키 (git 제외)
│   └── jwt.key.pub                # RSA 공개키
└── API_DESIGN.md                  # API 설계 문서
```

---

## 엔드포인트 현황

### Auth (`/auth`)
| 메서드 | 경로 | Guard | 상태 |
|--------|------|-------|------|
| POST | `/auth/register` | Public | ✅ 구현 완료 |
| POST | `/auth/login` | Public | ✅ 구현 완료 |
| POST | `/auth/refresh` | Public | ✅ 구현 완료 |
| POST | `/auth/logout` | JwtAuth | ✅ 구현 완료 |
| GET | `/auth/me` | JwtAuth | ✅ 구현 완료 |
| POST | `/auth/change-password` | JwtAuth | ✅ 구현 완료 |
| PATCH | `/auth/device-token` | JwtAuth | ✅ 구현 완료 |
| GET | `/auth/kakao` | OAuth | ✅ 구현 완료 |
| GET | `/auth/naver` | OAuth | ✅ 구현 완료 |
| GET | `/auth/apple` | OAuth | ✅ 구현 완료 |

### Users (`/users`)
| 메서드 | 경로 | Guard | 상태 |
|--------|------|-------|------|
| PATCH | `/users/me` | JwtAuth | ✅ 구현 완료 |

### 기타 도메인 모듈
| 모듈 | 상태 | 비고 |
|------|------|------|
| pets | ⏳ 스켈레톤 | 모듈 파일만 존재 |
| hospitals | ⏳ 스켈레톤 | |
| booking | ⚠️ 부분 구현 | Controller·Service 있으나 미완성 |
| medical-records | ⏳ 스켈레톤 | |
| daycare | ⏳ 스켈레톤 | |
| adoption | ⏳ 스켈레톤 | |
| insurance | ⏳ 스켈레톤 | |
| payments | ⏳ 스켈레톤 | |
| community | ⏳ 스켈레톤 | |
| notifications | ⏳ 스켈레톤 | |
| compliance | ⏳ 스켈레톤 | |
| analytics | ⏳ 스켈레톤 | |
| bff | ⏳ 스켈레톤 | |
| dashboard | ⏳ 스켈레톤 | |

---

## 완료된 작업 ✅

### 코어 인프라
- [x] NestJS 프로젝트 초기 셋업 및 전체 아키텍처 설계 (`e005783`)
- [x] JWT RS256 인증 시스템 (access 15min / refresh 7days)
- [x] Kakao / Naver / Apple OAuth2 전략
- [x] TypeORM 연결 (PostgreSQL)
- [x] Mongoose 연결 (MongoDB)
- [x] Redis 캐시 모듈
- [x] AES 암호화 + HMAC 검색 인덱스 (EncryptionService)
- [x] 감사 로그 (AuditService)
- [x] Rate Limiting (ThrottlerModule)
- [x] Swagger 문서 설정
- [x] PIPA 컴플라이언스 구조 (consentHistory)
- [x] MongoDB 하드코딩 자격증명 제거 (`dc01dda`)

### Users 모듈
- [x] User 엔티티 정의 (user.entity.ts) — 역할/상태/OAuth/PIPA 필드 포함
- [x] `PATCH /users/me` 엔드포인트 구현 (`1e8eef9`)
- [x] UpdateProfileDto (이름 2-50자 validation)
- [x] UsersService.updateProfile()
- [x] UsersController (JwtAuthGuard 보호)
- [x] UsersModule 연결 (TypeOrmModule + AuthModule)

---

## 진행 중 / 남은 작업 ⏳

### 우선순위 높음 (프론트엔드 연동 필요)
- [ ] **예약 API 완성** — `POST /bookings`, `GET /bookings`, `PATCH /bookings/:id/status`
- [ ] **환자/Pet API** — `GET /pets`, `POST /pets`, `GET /pets/:id`
- [ ] **직원 관리 API** — `GET /hospitals/:id/staff`, `POST/PATCH/DELETE`
- [ ] **룸 관리 API** — `GET /hospitals/:id/rooms`, `POST/PATCH/DELETE`

### 우선순위 중간
- [ ] **일정 API** — `GET/POST /bookings/calendar`
- [ ] **통화 기록 API** — `GET /calls`, `POST /calls`
- [ ] **알림 API** — `GET /notifications`, `PATCH /notifications/:id/read`
- [ ] **진료 기록 API** — `GET/POST /medical-records`

### 우선순위 낮음
- [ ] **메시지 API** — `GET/POST /messages`
- [ ] **리포트 API** — `GET /analytics/reports`
- [ ] **대시보드 통계 API** — `GET /dashboard/stats`
- [ ] **이메일 인증** — register 후 인증 메일 발송 (TODO 표시됨)
- [ ] **2FA (TOTP)** — twoFactorEnabled 필드 존재하나 미구현
- [ ] **파일 업로드** — profileImageUrl 저장 로직

### 기술 부채
- [ ] booking 모듈 미완성 코드 완성
- [ ] 테스트 코드 작성 (단위 + e2e)
- [ ] 환경변수 `.env.example` 파일 작성

---

## 알려진 이슈

| 위치 | 내용 | 심각도 |
|------|------|--------|
| git 히스토리 | 중복 커밋 (`ea844b2`↔`dc01dda`, `79e6230`↔`e005783`) — diverged history에서 발생 | 낮음 (기능 영향 없음) |
| booking 모듈 | 부분 구현 상태, 컴파일은 되나 기능 불완전 | 중간 |

---

## 핵심 패턴 / 규칙

### 응답 형식 (Envelope)
```typescript
// 모든 성공 응답
{ success: true, data: T, timestamp?: string }

// 오류 응답 (NestJS 기본)
{ statusCode: number, message: string, error: string }
```

### 인증 적용 방법
```typescript
// 보호된 엔드포인트
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
handler(@CurrentUser() user: User) { ... }

// 공개 엔드포인트
@Public()
handler() { ... }
```

### DTO 패턴
- `class-validator` 데코레이터 필수
- `@ApiProperty()` Swagger 문서화 필수
- 파일 위치: 해당 모듈의 `dto/` 디렉토리

---

## 커밋 히스토리 (주요)

| 해시 | 메시지 |
|------|--------|
| `5071fd3` | chore: merge remote and resolve UsersModule conflict |
| `1e8eef9` | feat(users): implement PATCH /users/me profile update endpoint |
| `dc01dda` | security: remove hardcoded MongoDB credentials from all scripts |
| `e005783` | feat: Pet to You Backend API - Complete Implementation |
