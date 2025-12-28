#!/bin/bash

# Commit ALL local changes and push
# Usage: ./COMMIT_ALL_CHANGES_NOW.sh YOUR_GITHUB_TOKEN

TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "Usage: ./COMMIT_ALL_CHANGES_NOW.sh YOUR_GITHUB_TOKEN"
    exit 1
fi

cd /Users/rebeccaalmond/Downloads/solowipe-main

echo "🔍 Checking for uncommitted changes..."
echo ""

# Show what will be committed
echo "📊 Files with changes:"
git status --short | grep -E "^ M|^A " | head -20
echo ""

# Check if there are any source file changes
SOURCE_CHANGES=$(git status --porcelain | grep -E "^ M.*src/|^A .*src/|^\?\?.*src/" | wc -l | tr -d ' ')

if [ "$SOURCE_CHANGES" = "0" ]; then
    echo "✅ No uncommitted source file changes found"
    echo ""
    echo "But you mentioned local changes aren't appearing..."
    echo "Let me check if there are any uncommitted files at all:"
    git status --porcelain
    echo ""
    echo "If you see files listed above, we should commit them."
    exit 0
fi

echo "📦 Staging ALL source changes..."
git add src/

echo ""
echo "📝 Committing all changes..."
git commit -m "feat: Commit all local changes including microsite and updates

- Landing page microsite
- All local modifications
- Complete feature set"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Commit failed. Check the error above."
    exit 1
fi

echo ""
echo "✅ Commit successful!"
echo ""
echo "🚀 Pushing to GitHub..."

# Create credential helper
CRED_FILE=$(mktemp)
cat > "$CRED_FILE" <<EOF
#!/bin/sh
echo username=beckialmond-rgb
echo password=$TOKEN
EOF
chmod +x "$CRED_FILE"

# Push
git -c credential.helper="$CRED_FILE" push origin main

PUSH_EXIT=$?

# Clean up
rm -f "$CRED_FILE"

if [ $PUSH_EXIT -eq 0 ]; then
    echo ""
    echo "✅ Success! All changes pushed to GitHub"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Check Netlify Dashboard - deployment should start automatically"
    echo "   2. Wait 1-3 minutes for build to complete"
    echo "   3. Test your microsite at: solowipe.netlify.app/landing"
    echo ""
    git log --oneline -1
else
    echo ""
    echo "❌ Push failed. Check the error above."
    exit 1
fi





