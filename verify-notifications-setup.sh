#!/bin/bash

echo "🔍 Pet to You - Notifications Module Verification"
echo "=================================================="
echo ""

# Check Node.js version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "  Node.js: $NODE_VERSION"

# Check if dependencies are installed
echo ""
echo "✓ Checking dependencies..."
DEPS=("nodemailer" "firebase-admin" "axios" "@nestjs/schedule" "@nestjs/event-emitter")
for dep in "${DEPS[@]}"; do
  if npm list "$dep" &> /dev/null; then
    echo "  ✅ $dep - installed"
  else
    echo "  ❌ $dep - missing"
  fi
done

# Check if module files exist
echo ""
echo "✓ Checking module files..."
FILES=(
  "src/modules/notifications/entities/notification-template.entity.ts"
  "src/modules/notifications/schemas/notification-log.schema.ts"
  "src/modules/notifications/services/email.service.ts"
  "src/modules/notifications/services/sms.service.ts"
  "src/modules/notifications/services/push.service.ts"
  "src/modules/notifications/services/notification.service.ts"
  "src/modules/notifications/listeners/booking.listener.ts"
  "src/modules/notifications/listeners/payment.listener.ts"
  "src/modules/notifications/listeners/adoption.listener.ts"
  "src/modules/notifications/queue/notification.processor.ts"
  "src/modules/notifications/notifications.module.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $(basename $file)"
  else
    echo "  ❌ $(basename $file) - missing"
  fi
done

# Check documentation
echo ""
echo "✓ Checking documentation..."
DOCS=(
  "src/modules/notifications/README.md"
  "src/modules/notifications/INSTALL.md"
  "src/modules/notifications/SUMMARY.md"
  "src/modules/notifications/QUICKSTART.md"
)

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "  ✅ $(basename $doc)"
  else
    echo "  ❌ $(basename $doc) - missing"
  fi
done

# Check environment variables (without revealing values)
echo ""
echo "✓ Checking environment variables..."
ENV_VARS=(
  "EMAIL_PROVIDER"
  "SMTP_HOST"
  "ENCRYPTION_KEY"
)

if [ -f ".env" ]; then
  for var in "${ENV_VARS[@]}"; do
    if grep -q "^${var}=" .env; then
      echo "  ✅ $var - configured"
    else
      echo "  ⚠️  $var - not configured"
    fi
  done
else
  echo "  ❌ .env file not found"
fi

# Summary
echo ""
echo "=================================================="
echo "📊 Verification Summary"
echo "=================================================="
echo ""
echo "Module Status: READY FOR CONFIGURATION"
echo ""
echo "Next Steps:"
echo "1. Configure .env file (see INSTALL.md)"
echo "2. Seed notification templates"
echo "3. Run test email (see QUICKSTART.md)"
echo "4. Integrate with booking/payment modules"
echo ""
echo "Documentation: src/modules/notifications/README.md"
echo "Quick Start: src/modules/notifications/QUICKSTART.md"
echo ""
