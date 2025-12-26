#!/bin/bash

# Deploy GoCardless OAuth Fix - Edge Functions
# This script deploys the fixed gocardless-connect and gocardless-callback functions

set -e  # Exit on error

echo "🚀 Deploying GoCardless OAuth Fix..."
echo ""

# Check if we're in the right directory
if [ ! -f "supabase/functions/gocardless-connect/index.ts" ]; then
    echo "❌ Error: Function files not found!"
    echo "   Please run this script from the project root directory"
    exit 1
fi

echo "✅ Function files found"
echo ""

# Check if user is logged in to Supabase
echo "🔐 Checking Supabase authentication..."
if ! npx supabase projects list &>/dev/null; then
    echo "⚠️  Not logged in to Supabase"
    echo "   Running: npx supabase login"
    npx supabase login
    echo ""
fi

echo "✅ Authenticated to Supabase"
echo ""

# Deploy gocardless-connect function
echo "📦 Deploying gocardless-connect function..."
npx supabase functions deploy gocardless-connect --project-ref owqjyaiptexqwafzmcwy

if [ $? -eq 0 ]; then
    echo "✅ gocardless-connect deployed successfully!"
    echo ""
else
    echo "❌ Failed to deploy gocardless-connect"
    exit 1
fi

# Deploy gocardless-callback function
echo "📦 Deploying gocardless-callback function..."
npx supabase functions deploy gocardless-callback --project-ref owqjyaiptexqwafzmcwy

if [ $? -eq 0 ]; then
    echo "✅ gocardless-callback deployed successfully!"
    echo ""
else
    echo "❌ Failed to deploy gocardless-callback"
    exit 1
fi

echo "🎉 All functions deployed successfully!"
echo ""
echo "📋 Next Steps:"
echo "   1. Wait 30-60 seconds for deployment to propagate"
echo "   2. Verify GoCardless Dashboard has redirect URI registered:"
echo "      - Sandbox: https://manage-sandbox.gocardless.com/settings/api"
echo "      - Live: https://manage.gocardless.com/settings/api"
echo "      - URI: https://solowipe.co.uk/gocardless-callback"
echo "   3. Test OAuth flow in your app"
echo "   4. Check Supabase Dashboard → Edge Functions → Logs for any errors"
echo ""
echo "📚 See GOCARDLESS_OAUTH_FIX_COMPLETE.md for detailed testing instructions"

