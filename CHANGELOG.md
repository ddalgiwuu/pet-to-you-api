# Pet to You API — 변경 로그

> 날짜/시간별 작업 내용, 수정 사항, 에러 및 해결 기록

---

## 2026-02-26

### [기능 추가] PATCH /users/me 구현 (`1e8eef9`)
**시간**: 2026-02-26 (현재 세션)

**배경**:
- 프론트엔드 ProfileModal에서 `PATCH /users/me` 호출 시 404 오류
- `UsersModule`이 빈 스켈레톤 (`controllers: []`, `providers: []`) 상태

**신규 파일**:
```
src/modules/users/
├── dto/update-profile.dto.ts       # name 필드 (IsOptional, 2-50자)
├── services/users.service.ts       # updateProfile(userId, dto) → User
└── controllers/users.controller.ts # PATCH /users/me (JwtAuthGuard)
```

**수정 파일**:
- `src/modules/users/users.module.ts`
  - `TypeOrmModule.forFeature([User])` 추가
  - `AuthModule` import (JwtAuthGuard 사용을 위해)
  - `UsersController`, `UsersService` 등록

**응답 형식**:
```typescript
// PATCH /users/me
// Request Body: { name?: string }
// Response: { success: true, data: User }
```

**TypeScript 컴파일**: 오류 없음 (`npx tsc --noEmit` 통과)

---

### [보안] MongoDB 하드코딩 자격증명 제거 (`dc01dda`)
**시간**: 이전 세션 (재확인 2026-02-26)

**내용**: 스크립트 파일에 하드코딩된 MongoDB 접속 정보 환경변수로 대체

---

### [인프라] 초기 백엔드 구현 (`e005783`)
**시간**: 이전 세션

**내용**:
- NestJS 전체 아키텍처 구성
- Auth 모듈 (JWT RS256, OAuth Kakao/Naver/Apple)
- TypeORM + Mongoose 연결
- Redis 캐시, AES 암호화, 감사 로그, Rate Limiting
- 전체 도메인 모듈 스켈레톤 생성

---

### [인프라] Git 히스토리 diverged 해결 (`5071fd3`)
**시간**: 2026-02-26 (현재 세션)

**에러 메시지**:
```
! [rejected] main -> main (non-fast-forward)
error: failed to push some refs to 'https://github.com/ddalgiwuu/pet-to-you-api.git'
```

**원인**: 로컬(main)과 리모트(main)이 공통 조상 없이 분기
- 로컬: `79e6230` → `ea844b2` → `1e8eef9`
- 리모트: `e005783` → `dc01dda`
- 두 경로가 동일한 콘텐츠지만 다른 해시 (별도 경로로 커밋된 것으로 추정)

**충돌 파일**: `src/modules/users/users.module.ts`
```
HEAD(로컬): 구현 완료 버전 (TypeOrmModule, AuthModule, controller, service)
dc01dda(리모트): 빈 스켈레톤 버전
```

**해결 과정**:
1. `git stash`로 unstaged 변경 임시 저장
2. `git pull origin main --no-rebase --allow-unrelated-histories`
3. 충돌 파일 수동 해결: 로컬(구현 버전) 채택
4. `git add src/modules/users/users.module.ts && git commit` → merge commit `5071fd3`
5. `git push origin main` 성공
6. `git stash pop`으로 unstaged 변경 복원

---

## 알려진 미해결 이슈

| 날짜 발견 | 위치 | 이슈 | 상태 |
|-----------|------|------|------|
| 2026-02-26 | git 히스토리 | 중복 커밋 해시 (ea844b2↔dc01dda, 79e6230↔e005783) | ⏳ 기능 영향 없음, 정리 예정 |
| 2026-02-26 | booking 모듈 | 부분 구현 상태 (컴파일은 되나 기능 불완전) | ⏳ 미해결 |
