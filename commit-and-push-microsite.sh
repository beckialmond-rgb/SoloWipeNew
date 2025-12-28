#!/bin/bash

# Commit and push Landing page route
# Usage: ./commit-and-push-microsite.sh YOUR_GITHUB_TOKEN

TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "Usage: ./commit-and-push-microsite.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "Example:"
    echo "  ./commit-and-push-microsite.sh ghp_abc123xyz789"
    exit 1
fi

cd /Users/rebeccaalmond/Downloads/solowipe-main

echo "📦 Staging changes..."
git add src/App.tsx

echo ""
echo "📝 Committing..."
git commit -m "feat: Add Landing page route for microsite"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Commit failed. Check the error above."
    exit 1
fi

echo ""
echo "🚀 Pushing to GitHub..."

# Create temporary credential helper
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
    echo "✅ Success! Your microsite route has been pushed to GitHub"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Check Netlify Dashboard - deployment should start automatically"
    echo "   2. Wait 1-3 minutes for build to complete"
    echo "   3. Test your microsite at: solowipe.netlify.app/landing"
    echo ""
    git status
else
    echo ""
    echo "❌ Push failed. Check the error above."
    exit 1
fi





