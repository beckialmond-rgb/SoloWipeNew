#!/bin/bash
# Quick Deployment Test Script

echo "🔍 Starting deployment tests..."
echo ""

echo "1️⃣ Testing build..."
if npm run build > /dev/null 2>&1; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi

echo ""
echo "2️⃣ Checking build output..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
  echo "✅ Build output exists"
  echo "   - Files: $(ls -1 dist/ | wc -l | tr -d ' ') files"
else
  echo "❌ Build output missing"
  exit 1
fi

echo ""
echo "3️⃣ Checking Edge Functions CORS updates..."
UPDATED_FUNCTIONS=0
for func in create-checkout delete-account gocardless-check-mandate gocardless-disconnect gocardless-connect check-subscription customer-portal stripe-webhook; do
  if grep -q "getCorsHeaders" "supabase/functions/$func/index.ts" 2>/dev/null; then
    echo "   ✅ $func"
    ((UPDATED_FUNCTIONS++))
  else
    echo "   ❌ $func - Missing CORS update"
  fi
done

echo ""
echo "4️⃣ Checking environment variable validation..."
VALIDATED_FUNCTIONS=0
for func in delete-account gocardless-check-mandate gocardless-disconnect gocardless-create-mandate gocardless-webhook check-subscription customer-portal stripe-webhook; do
  if grep -q "if (!supabaseUrl || !serviceRoleKey)" "supabase/functions/$func/index.ts" 2>/dev/null || \
     grep -q "Server configuration error" "supabase/functions/$func/index.ts" 2>/dev/null; then
    echo "   ✅ $func"
    ((VALIDATED_FUNCTIONS++))
  else
    echo "   ⚠️  $func - May need validation check"
  fi
done

echo ""
echo "📊 Summary:"
echo "   - Build: ✅"
echo "   - CORS Updates: $UPDATED_FUNCTIONS/8 functions"
echo "   - Env Validation: $VALIDATED_FUNCTIONS/8 functions"
echo ""
echo "✅ Deployment test complete!"
