#!/bin/bash

# Push to GitHub script with authentication
# Usage: GIT_TOKEN=your_token ./push-to-github.sh

if [ -z "$GIT_TOKEN" ]; then
    echo "Usage: GIT_TOKEN=your_token ./push-to-github.sh"
    echo ""
    echo "This script will:"
    echo "  1. Pull and merge with GitHub"
    echo "  2. Push your local commits"
    echo ""
    exit 1
fi

cd /Users/rebeccaalmond/Downloads/solowipe-main

echo "Step 1: Pulling and merging with GitHub..."
git -c credential.helper='!f() { echo username=beckialmond-rgb; echo password='$GIT_TOKEN'; }; f' pull origin main --allow-unrelated-histories --no-edit

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Pull had conflicts or issues. Check the output above."
    echo "   Resolve any conflicts, then run:"
    echo "   git add ."
    echo "   git commit -m 'Merge remote changes'"
    echo "   GIT_TOKEN=your_token ./push-to-github.sh"
    exit 1
fi

echo ""
echo "Step 2: Pushing to GitHub..."
git -c credential.helper='!f() { echo username=beckialmond-rgb; echo password='$GIT_TOKEN'; }; f' push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code has been pushed to GitHub"
    echo ""
    git status
else
    echo ""
    echo "❌ Push failed. Check the error above."
    exit 1
fi





