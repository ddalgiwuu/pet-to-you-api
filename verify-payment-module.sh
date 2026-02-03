#!/bin/bash

echo "======================================"
echo "Payment Module Verification Script"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1 - MISSING"
        ((FAILED++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1/ - MISSING"
        ((FAILED++))
    fi
}

echo "Checking Directory Structure..."
echo "================================"
check_dir "src/modules/payments"
check_dir "src/modules/payments/entities"
check_dir "src/modules/payments/services"
check_dir "src/modules/payments/controllers"
check_dir "src/modules/payments/dto"
check_dir "src/modules/payments/interfaces"
echo ""

echo "Checking Core Files..."
echo "======================"
check_file "src/modules/payments/entities/payment.entity.ts"
check_file "src/modules/payments/entities/payment-transaction.entity.ts"
check_file "src/modules/payments/services/payments.service.ts"
check_file "src/modules/payments/services/toss-payments.service.ts"
check_file "src/modules/payments/controllers/payments.controller.ts"
check_file "src/modules/payments/payments.module.ts"
echo ""

echo "Checking DTOs..."
echo "================"
check_file "src/modules/payments/dto/create-payment.dto.ts"
check_file "src/modules/payments/dto/confirm-payment.dto.ts"
check_file "src/modules/payments/dto/refund-payment.dto.ts"
echo ""

echo "Checking Interfaces..."
echo "======================"
check_file "src/modules/payments/interfaces/toss-payments.interface.ts"
echo ""

echo "Checking Database Migration..."
echo "==============================="
check_file "src/database/migrations/1737120000000-CreatePaymentTables.ts"
echo ""

echo "Checking Documentation..."
echo "=========================="
check_file "src/modules/payments/README.md"
check_file "src/modules/payments/INTEGRATION_GUIDE.md"
check_file "src/modules/payments/SUMMARY.md"
check_file "src/modules/payments/QUICK_REFERENCE.md"
check_file ".env.payments.example"
check_file "PAYMENT_MODULE_CHECKLIST.md"
echo ""

echo "Checking File Contents..."
echo "=========================="

# Check if entities have proper exports
if grep -q "export class Payment" src/modules/payments/entities/payment.entity.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Payment entity exports class"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Payment entity missing class export"
    ((FAILED++))
fi

if grep -q "export class PaymentTransaction" src/modules/payments/entities/payment-transaction.entity.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} PaymentTransaction entity exports class"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} PaymentTransaction entity missing class export"
    ((FAILED++))
fi

# Check if services have proper decorators
if grep -q "@Injectable()" src/modules/payments/services/payments.service.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} PaymentsService has @Injectable decorator"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} PaymentsService missing @Injectable decorator"
    ((FAILED++))
fi

# Check if controller has proper decorators
if grep -q "@Controller('payments')" src/modules/payments/controllers/payments.controller.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} PaymentsController has @Controller decorator"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} PaymentsController missing @Controller decorator"
    ((FAILED++))
fi

# Check if module exports services
if grep -q "exports: \[PaymentsService" src/modules/payments/payments.module.ts 2>/dev/null; then
    echo -e "${GREEN}✓${NC} PaymentsModule exports PaymentsService"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} PaymentsModule doesn't export PaymentsService"
    ((FAILED++))
fi

echo ""
echo "======================================"
echo "Verification Summary"
echo "======================================"
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Run: npm run migration:run"
    echo "2. Configure .env with Toss Payments credentials"
    echo "3. Import PaymentsModule in app.module.ts"
    echo "4. Start server: npm run start:dev"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    exit 1
fi
