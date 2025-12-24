#!/bin/bash

# Quick script to deploy the GoCardless Create Mandate function

echo "🚀 Deploying gocardless-create-mandate function..."
echo ""

# Check if function file exists
if [ ! -f "supabase/functions/gocardless-create-mandate/index.ts" ]; then
    echo "❌ Error: Function file not found!"
    echo "   Expected: supabase/functions/gocardless-create-mandate/index.ts"
    exit 1
fi

echo "✅ Function file found"
echo ""

# Deploy the function
echo "📦 Deploying to Supabase..."
npx supabase functions deploy gocardless-create-mandate --project-ref owqjyaiptexqwafzmcwy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Function deployed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Wait 1-2 minutes for deployment to propagate"
    echo "   2. Try the 'Invite to Direct Debit' button again"
    echo "   3. Check Supabase Dashboard → Edge Functions → Logs if issues persist"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "💡 Try these steps:"
    echo "   1. Run: npx supabase login"
    echo "   2. Then run this script again"
    echo "   3. Or deploy manually via Supabase Dashboard"
fi

