#!/bin/bash
# Smoke Test Command for send-email Edge Function
# This script reads your .env file and constructs the cURL command

cd /Users/rebeccaalmond/Downloads/solowipe-main

# Read Supabase key from .env file
if [ -f ".env" ]; then
    SUPABASE_KEY=$(grep "VITE_SUPABASE_PUBLISHABLE_KEY" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
    
    if [ -z "$SUPABASE_KEY" ]; then
        echo "❌ ERROR: VITE_SUPABASE_PUBLISHABLE_KEY not found in .env file"
        echo ""
        echo "Alternative: Use SERVICE_ROLE_KEY from Supabase Dashboard"
        echo "Get it from: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/settings/api"
        exit 1
    fi
    
    echo "✅ Found Supabase key in .env"
    echo ""
    echo "🔥 Running Smoke Test..."
    echo ""
    
    # Run the cURL command
    curl -X POST https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/send-email \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SUPABASE_KEY" \
      -d '{
        "to": "hola@tipsenor.com",
        "subject": "Cursor Smoke Test",
        "html": "<strong>It works!</strong>"
      }'
    
    echo ""
    echo ""
    echo "📋 Response above shows:"
    echo "   ✅ Success: {\"success\": true, \"messageId\": \"re_...\"}"
    echo "   ❌ Function not deployed: {\"code\":\"NOT_FOUND\",\"message\":\"Requested function was not found\"}"
    echo "   ❌ Auth error: {\"error\":\"Authorization header required\"}"
    echo "   ❌ Missing secret: {\"error\":\"RESEND_API_KEY environment variable is not set\"}"
    
else
    echo "❌ ERROR: .env file not found"
    exit 1
fi

