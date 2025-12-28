#!/bin/bash

# Verify what's actually deployed vs what's local
# This helps diagnose why changes aren't appearing

cd /Users/rebeccaalmond/Downloads/solowipe-main

echo "🔍 Deployment Verification"
echo "========================="
echo ""

echo "📊 Local Repository Status:"
echo "----------------------------"
git status --short
echo ""

echo "📦 Latest Commits:"
echo "-----------------"
git log --oneline -5
echo ""

echo "🌐 Remote Repository:"
echo "--------------------"
git remote -v
echo ""

echo "✅ Files in Latest Commit:"
echo "-------------------------"
echo "Landing.tsx:"
git ls-files src/pages/Landing.tsx && echo "  ✓ Committed" || echo "  ✗ NOT committed"
echo ""

echo "App.tsx (checking for Landing route):"
if git show HEAD:src/App.tsx | grep -q "Landing"; then
    echo "  ✓ Landing route found in commit"
    git show HEAD:src/App.tsx | grep -n "Landing" | head -2
else
    echo "  ✗ Landing route NOT found in commit"
fi
echo ""

echo "🔨 Local Build Test:"
echo "-------------------"
if npm run build > /dev/null 2>&1; then
    echo "  ✓ Build succeeds locally"
    if [ -f "dist/index.html" ]; then
        echo "  ✓ Build output exists"
        echo "  📦 Bundle size: $(du -h dist/assets/index.js 2>/dev/null | cut -f1)"
    fi
else
    echo "  ✗ Build FAILS locally"
    echo "  Check errors above"
fi
echo ""

echo "📋 Next Steps:"
echo "-------------"
echo "1. Check Netlify Dashboard:"
echo "   - What commit is it deploying? (should be 81d2a80)"
echo "   - Is build succeeding?"
echo "   - Any errors in build logs?"
echo ""
echo "2. Check GitHub:"
echo "   - Visit: https://github.com/beckialmond-rgb/SoloWipeNew"
echo "   - Verify Landing.tsx exists"
echo "   - Verify App.tsx has Landing route"
echo ""
echo "3. Test locally:"
echo "   - Run: npm run preview"
echo "   - Visit: http://localhost:4173/landing"
echo "   - Does it work?"
echo ""





