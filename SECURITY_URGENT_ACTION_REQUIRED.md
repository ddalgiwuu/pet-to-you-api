# 🚨 긴급 보안 조치 필요 - MongoDB Credentials 노출

## ⚠️ 발견된 보안 위협

**위험도**: 🔴 **CRITICAL**

MongoDB Atlas credentials가 GitHub public 저장소에 노출되었습니다.

**노출된 정보**:
- Username: `wonseok9706_db_user`
- Password: `1EY0d2oKTCn2o5tp`
- Cluster: `pettoyou.uq2lrlf.mongodb.net`
- Database: `pettoyou`

**영향 범위**:
- ✅ 누구나 데이터베이스에 읽기/쓰기/삭제 가능
- ✅ 2,137개 병원 데이터 유출 가능
- ✅ 사용자 개인정보 접근 가능 (향후 데이터)

---

## 🔥 즉시 조치 사항 (우선순위 순)

### 1️⃣ MongoDB 비밀번호 즉시 변경 (5분 내)

**방법 A: 사용자 비밀번호 변경** (권장)
```bash
# MongoDB Atlas 웹사이트 접속
1. https://cloud.mongodb.com/v2/68620eeb0db169181af67e0a#/security/database
2. "Database Access" 탭 클릭
3. 사용자 "wonseok9706_db_user" 찾기
4. "Edit" 버튼 클릭
5. "Edit Password" 클릭
6. 새 비밀번호 생성 (자동 생성 권장)
7. "Update User" 클릭
```

**방법 B: 사용자 삭제 후 재생성** (더 안전)
```bash
1. Database Access에서 "wonseok9706_db_user" 삭제
2. "Add New Database User" 클릭
3. 새 사용자명과 비밀번호 생성
4. 권한 설정: "Read and write to any database"
5. "Add User" 클릭
```

**⚠️ 중요**: 새 비밀번호를 받으면 즉시 로컬 `.env` 파일 업데이트!

---

### 2️⃣ 로컬 .env 파일 업데이트 (5분 내)

```bash
# pet-to-you-api/.env 파일 열기
nano /Users/ryansong/Desktop/DEV/Pet_to_You/pet-to-you-api/.env

# MONGODB_URI 라인 찾아서 새 비밀번호로 변경
MONGODB_URI=mongodb+srv://NEW_USERNAME:NEW_PASSWORD@pettoyou.uq2lrlf.mongodb.net/pettoyou?appName=pettoyou

# 저장 후 종료 (Ctrl+O, Ctrl+X)
```

---

### 3️⃣ Git History에서 Credentials 완전 제거 (10분)

**옵션 A: BFG Repo-Cleaner 사용** (권장 - 빠르고 안전)

```bash
# BFG 설치 (Homebrew)
brew install bfg

# 저장소 백업
cd /Users/ryansong/Desktop/DEV/Pet_to_You
cp -r pet-to-you-api pet-to-you-api-backup

# credentials 제거
cd pet-to-you-api
bfg --replace-text <(echo 'wonseok9706_db_user==>USERNAME_REDACTED')
bfg --replace-text <(echo '1EY0d2oKTCn2o5tp==>PASSWORD_REDACTED')

# Git history 정리
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# GitHub에 강제 푸시
git push --force origin main
```

**옵션 B: git filter-repo 사용**

```bash
# git filter-repo 설치
brew install git-filter-repo

# credentials 제거
cd /Users/ryansong/Desktop/DEV/Pet_to_You/pet-to-you-api
git filter-repo --replace-text <(echo 'wonseok9706_db_user==>USERNAME_REDACTED')
git filter-repo --replace-text <(echo '1EY0d2oKTCn2o5tp==>PASSWORD_REDACTED')

# 원격 저장소 다시 설정
git remote add origin https://github.com/ddalgiwuu/pet-to-you-api.git

# 강제 푸시
git push --force origin main
```

---

### 4️⃣ 수정된 파일 커밋 및 푸시 (즉시)

```bash
cd /Users/ryansong/Desktop/DEV/Pet_to_You/pet-to-you-api

# 수정된 파일 확인
git status

# 변경사항 추가
git add scripts/*.js scripts/*.ts test-*.js .env.example

# 커밋
git commit -m "security: remove hardcoded MongoDB credentials

- Move all credentials to environment variables
- Update all scripts to use process.env.MONGODB_URI
- Add MONGODB_URI to .env.example with placeholder
- Add dotenv config to all scripts

BREAKING CHANGE: Scripts now require MONGODB_URI in .env file

Security: Fixes exposed credentials in public repository"

# 푸시
git push origin main
```

---

## 🛡️ 추가 보안 강화 조치

### 5️⃣ MongoDB IP 화이트리스트 설정

```bash
1. https://cloud.mongodb.com/v2/68620eeb0db169181af67e0a#/security/network/accessList
2. "IP Access List" 탭
3. "Add IP Address" 클릭
4. 옵션 선택:
   - "Add Current IP Address" (개발용)
   - 또는 특정 IP/CIDR 범위 입력
5. "Confirm" 클릭
```

**권장**: `0.0.0.0/0` (모든 IP 허용) 제거하고 특정 IP만 허용

---

### 6️⃣ MongoDB 감사 로그 활성화

```bash
1. Database Deployments → 클러스터 선택
2. "Advanced" 탭
3. "Database Auditing" 활성화
4. 감시할 이벤트 선택:
   - Authentication
   - DDL Operations
   - CRUD Operations
```

**⚠️ 참고**: 시간당 비용 증가 가능

---

### 7️⃣ GitHub Secret Scanning Alerts 확인

```bash
# GitHub 저장소 설정 확인
1. https://github.com/ddalgiwuu/pet-to-you-api/settings/security_analysis
2. "Secret scanning" 활성화
3. 기존 알림 확인
```

---

## ✅ 수정 완료 항목

### 코드 수정 (2026-02-03)
- ✅ `scripts/load-hospitals.js` - dotenv + process.env
- ✅ `scripts/load-all-hospital-data.js` - dotenv + process.env
- ✅ `scripts/reload-hospitals-mongodb.js` - dotenv + process.env
- ✅ `scripts/load-mongodb-hospitals.js` - dotenv + process.env
- ✅ `scripts/load-hospitals-to-mongodb.ts` - dotenv + process.env
- ✅ `test-mongo-connection.js` - dotenv + process.env
- ✅ `test-encoded-password.js` - dotenv + process.env
- ✅ `.env.example` - placeholder 추가

### 보안 개선
- ✅ `.gitignore`에 `.env` 포함 확인
- ✅ 모든 credentials를 환경 변수로 이동
- ✅ 에러 처리 추가 (MONGODB_URI 없으면 종료)

---

## 📋 작업 체크리스트

### 즉시 (1시간 이내)
- [ ] MongoDB 비밀번호 변경 또는 사용자 삭제
- [ ] 로컬 `.env` 파일 업데이트
- [ ] 수정된 코드 커밋 및 푸시
- [ ] Git history에서 credentials 제거

### 오늘 내
- [ ] IP 화이트리스트 설정
- [ ] 데이터베이스 접근 로그 확인
- [ ] GitHub Secret Scanning 활성화

### 이번 주 내
- [ ] MongoDB 감사 로그 활성화
- [ ] AWS IAM 인증 설정 검토
- [ ] 정기 보안 감사 일정 수립

---

## 🔐 MongoDB 보안 모범 사례

### 1. 인증 및 권한
- ✅ 강력한 비밀번호 사용 (20+ 문자, 특수문자 포함)
- ✅ 최소 권한 원칙 (필요한 권한만 부여)
- ✅ 정기적인 비밀번호 변경 (3개월마다)
- ✅ 사용하지 않는 사용자 삭제

### 2. 네트워크 보안
- ✅ IP 화이트리스트 사용 (특정 IP만 허용)
- ✅ Private Endpoints 사용 (프로덕션)
- ✅ VPN 또는 VPC Peering 설정

### 3. 데이터 보호
- ✅ Encryption at Rest 활성화 (기본 활성화됨)
- ✅ Encryption in Transit (TLS/SSL - 기본 활성화됨)
- ✅ 정기 백업 설정

### 4. 모니터링
- ✅ 접근 로그 모니터링
- ✅ 비정상 활동 알림 설정
- ✅ 정기 보안 감사

---

## 📞 추가 지원

### MongoDB 지원팀 연락
- 지원 포털: https://support.mongodb.com/
- 보안 문제 보고: security@mongodb.com

### 긴급 조치 완료 후
- [ ] 이 문서 확인
- [ ] 모든 체크리스트 완료
- [ ] 보안 강화 조치 검토
- [ ] 팀에 보안 사고 보고

---

**작성일**: 2026-02-03
**심각도**: CRITICAL
**조치 기한**: 즉시 (1시간 이내)

⚠️ **이 문서를 완료할 때까지 절대 삭제하지 마세요!**
