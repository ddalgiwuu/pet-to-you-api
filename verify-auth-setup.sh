#!/bin/bash

echo "🔍 Pet to You API - Authentication System Verification"
echo "======================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    return 0
  else
    echo -e "${RED}✗${NC} $1 (missing)"
    return 1
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1/"
    return 0
  else
    echo -e "${RED}✗${NC} $1/ (missing)"
    return 1
  fi
}

# Check RSA keys
echo "1️⃣  Checking RSA Keys..."
check_file "keys/jwt.key"
check_file "keys/jwt.key.pub"
echo ""

# Check authentication module structure
echo "2️⃣  Checking Authentication Module Structure..."
check_dir "src/core/auth"
check_dir "src/core/auth/strategies"
check_dir "src/core/auth/guards"
check_dir "src/core/auth/decorators"
check_dir "src/core/auth/dto"
check_dir "src/core/auth/services"
check_dir "src/core/auth/controllers"
echo ""

# Check strategies
echo "3️⃣  Checking Strategies..."
check_file "src/core/auth/strategies/jwt.strategy.ts"
check_file "src/core/auth/strategies/jwt-refresh.strategy.ts"
check_file "src/core/auth/strategies/kakao.strategy.ts"
check_file "src/core/auth/strategies/naver.strategy.ts"
check_file "src/core/auth/strategies/apple.strategy.ts"
echo ""

# Check guards
echo "4️⃣  Checking Guards..."
check_file "src/core/auth/guards/jwt-auth.guard.ts"
check_file "src/core/auth/guards/roles.guard.ts"
check_file "src/core/auth/guards/permissions.guard.ts"
echo ""

# Check decorators
echo "5️⃣  Checking Decorators..."
check_file "src/core/auth/decorators/current-user.decorator.ts"
check_file "src/core/auth/decorators/roles.decorator.ts"
check_file "src/core/auth/decorators/permissions.decorator.ts"
check_file "src/core/auth/decorators/public.decorator.ts"
echo ""

# Check DTOs
echo "6️⃣  Checking DTOs..."
check_file "src/core/auth/dto/register.dto.ts"
check_file "src/core/auth/dto/login.dto.ts"
check_file "src/core/auth/dto/refresh-token.dto.ts"
check_file "src/core/auth/dto/change-password.dto.ts"
check_file "src/core/auth/dto/auth-response.dto.ts"
echo ""

# Check services and controllers
echo "7️⃣  Checking Services & Controllers..."
check_file "src/core/auth/services/auth.service.ts"
check_file "src/core/auth/controllers/auth.controller.ts"
check_file "src/core/auth/auth.module.ts"
echo ""

# Check documentation
echo "8️⃣  Checking Documentation..."
check_file "docs/AUTHENTICATION.md"
check_file "docs/AUTH_SETUP.md"
check_file "docs/AUTH_INTEGRATION_GUIDE.md"
check_file "docs/AUTH_TESTING.md"
check_file "docs/SECURITY_CHECKLIST.md"
check_file "docs/AUTH_QUICK_REFERENCE.md"
check_file ".env.example"
echo ""

# Check dependencies
echo "9️⃣  Checking Dependencies..."
if grep -q "passport-jwt" package.json; then
  echo -e "${GREEN}✓${NC} passport-jwt"
else
  echo -e "${RED}✗${NC} passport-jwt (missing)"
fi

if grep -q "passport-kakao" package.json; then
  echo -e "${GREEN}✓${NC} passport-kakao"
else
  echo -e "${RED}✗${NC} passport-kakao (missing)"
fi

if grep -q "passport-naver-v2" package.json; then
  echo -e "${GREEN}✓${NC} passport-naver-v2"
else
  echo -e "${RED}✗${NC} passport-naver-v2 (missing)"
fi

if grep -q "passport-apple" package.json; then
  echo -e "${GREEN}✓${NC} passport-apple"
else
  echo -e "${RED}✗${NC} passport-apple (missing)"
fi

if grep -q "bcrypt" package.json; then
  echo -e "${GREEN}✓${NC} bcrypt"
else
  echo -e "${RED}✗${NC} bcrypt (missing)"
fi
echo ""

# Check Redis connectivity
echo "🔟 Checking Services..."
if redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Redis is running"
else
  echo -e "${YELLOW}⚠${NC}  Redis is not running (start with: redis-server)"
fi

# Check PostgreSQL
if psql -h localhost -U postgres -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} PostgreSQL is running"
else
  echo -e "${YELLOW}⚠${NC}  PostgreSQL is not running or not configured"
fi
echo ""

# Summary
echo "======================================================"
echo "✅ Authentication System Verification Complete"
echo ""
echo "Next Steps:"
echo "1. Configure .env file (see .env.example)"
echo "2. Start services: npm run start:dev"
echo "3. Test registration: see docs/AUTH_SETUP.md"
echo "4. Review security: docs/SECURITY_CHECKLIST.md"
echo ""
echo "Documentation: docs/AUTH_QUICK_REFERENCE.md"
