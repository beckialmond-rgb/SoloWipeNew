#!/bin/bash

echo "🧪 Testing Accept Invite Flow"
echo ""

# Get Supabase URL from .env or set manually
SUPABASE_URL="${SUPABASE_URL:-https://owqjyaiptexqwafzmcwy.supabase.co}"

echo "1. Testing CORS preflight..."
curl -X OPTIONS "${SUPABASE_URL}/functions/v1/accept-invite" \
  -H "Content-Type: application/json" \
  -v 2>&1 | grep -i "access-control"

echo ""
echo "2. Testing function exists..."
curl -X POST "${SUPABASE_URL}/functions/v1/accept-invite" \
  -H "Content-Type: application/json" \
  -d '{"invite_token":"test","password":"test"}' \
  -s | jq '.' || echo "Function responded (expected error for test data)"

echo ""
echo "✅ Basic function test complete!"
echo "Next: Test with real invite token in browser"

