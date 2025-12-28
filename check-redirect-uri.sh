#!/bin/bash

# Quick script to help diagnose redirect URI issues

echo "🔍 GoCardless OAuth Redirect URI Diagnostic"
echo ""
echo "This script helps you verify the redirect URI configuration."
echo ""

echo "Step 1: Check what redirect URI your app is using..."
echo ""
echo "Please check your browser console when clicking 'Connect GoCardless'"
echo "Look for this log:"
echo "  [GC-CLIENT] Hardcoded redirect URL: ..."
echo ""

read -p "Enter the redirect URI from your console (or press Enter to skip): " redirect_uri

if [ -n "$redirect_uri" ]; then
    echo ""
    echo "✅ Redirect URI from app: $redirect_uri"
    echo ""
    echo "Step 2: Verify in GoCardless Dashboard"
    echo ""
    echo "For SANDBOX environment:"
    echo "  1. Go to: https://manage-sandbox.gocardless.com/settings/api"
    echo "  2. Find 'Redirect URIs' section"
    echo "  3. Check if this URI is registered:"
    echo "     $redirect_uri"
    echo ""
    echo "For LIVE environment:"
    echo "  1. Go to: https://manage.gocardless.com/settings/api"
    echo "  2. Find 'Redirect URIs' section"
    echo "  3. Check if this URI is registered:"
    echo "     $redirect_uri"
    echo ""
else
    echo ""
    echo "Skipping redirect URI check."
    echo ""
fi

echo "Step 3: Check Supabase Environment"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/owqjyaiptexqwafzmcwy/settings/functions"
echo "2. Check the value of GOCARDLESS_ENVIRONMENT:"
echo "   - If 'sandbox' → Use sandbox dashboard"
echo "   - If 'live' → Use live dashboard"
echo ""

echo "Step 4: Verify Exact Match Requirements"
echo ""
echo "The redirect URI must match EXACTLY:"
echo "  ✅ No trailing slash"
echo "  ✅ Correct protocol (https for production, http for localhost)"
echo "  ✅ Correct domain (no www if app doesn't use it)"
echo "  ✅ Correct path (/gocardless-callback)"
echo ""

echo "Step 5: Common Issues"
echo ""
echo "❌ Common mistakes:"
echo "  - Trailing slash: https://solowipe.co.uk/gocardless-callback/"
echo "  - Wrong protocol: http://solowipe.co.uk/gocardless-callback"
echo "  - www mismatch: https://www.solowipe.co.uk/gocardless-callback"
echo "  - Environment mismatch: sandbox Client ID with live redirect URI"
echo ""

echo "✅ Next Steps:"
echo "  1. Register the redirect URI in GoCardless Dashboard if not already"
echo "  2. Wait 1-2 minutes for changes to propagate"
echo "  3. Clear browser cache"
echo "  4. Try OAuth flow again"
echo ""
echo "📚 See DEBUG_NO_AUTH_CODE.md for detailed troubleshooting"





