#!/bin/bash

# Commit ALL local changes that aren't committed
# This will capture everything that's different from the last commit

cd /Users/rebeccaalmond/Downloads/solowipe-main

echo "🔍 Checking for uncommitted changes..."
echo ""

# Check what's different
DIFF_COUNT=$(git diff HEAD --name-only src/ | wc -l | tr -d ' ')

if [ "$DIFF_COUNT" = "0" ]; then
    echo "✅ No uncommitted source file changes"
    echo ""
    git status --short
    exit 0
fi

echo "⚠️  Found $DIFF_COUNT files with uncommitted changes:"
echo ""
git diff HEAD --name-only src/ | head -20
echo ""

echo "📦 Staging ALL source file changes..."
git add src/

echo ""
echo "📝 Committing changes..."
git commit -m "feat: Commit all local source code changes

- All uncommitted modifications
- Complete local work
- Ready for deployment"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Commit failed. Check the error above."
    exit 1
fi

echo ""
echo "✅ Commit successful!"
echo ""
echo "📋 Next: Push to GitHub"
echo "   Run: git push origin main"
echo ""





