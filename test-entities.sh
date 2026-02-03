#!/bin/bash

echo "🔍 Testing TypeORM entity loading..."

npm run start:dev > /tmp/typeorm-test.log 2>&1 &
PID=$!

sleep 12

echo ""
echo "📊 Application startup log:"
cat /tmp/typeorm-test.log | grep -E "(started|listening|error|Error|Exception|RangeError|Maximum call stack)" | head -40

kill $PID 2>/dev/null || true

if grep -q "Maximum call stack" /tmp/typeorm-test.log; then
  echo ""
  echo "❌ FAILED: Still getting stack overflow error"
  exit 1
elif grep -q "Nest application successfully started" /tmp/typeorm-test.log; then
  echo ""
  echo "✅ SUCCESS: Application started successfully"
  exit 0
else
  echo ""
  echo "⚠️  Unable to determine status - check log above"
  exit 2
fi
