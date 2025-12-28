#!/bin/bash

# Push-only script (for after conflicts are resolved)
# Usage: ./push-only.sh YOUR_TOKEN

TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "Usage: ./push-only.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "Example:"
    echo "  ./push-only.sh ghp_abc123xyz789"
    exit 1
fi

cd /Users/rebeccaalmond/Downloads/solowipe-main

echo "Pushing to GitHub..."
echo ""

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
    echo "✅ Success! Your code has been pushed to GitHub"
    echo ""
    git status
else
    echo ""
    echo "❌ Push failed. Check the error above."
    exit 1
fi





