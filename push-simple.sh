#!/bin/bash

# Simple push script for zsh
# Usage: ./push-simple.sh YOUR_TOKEN

TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "Usage: ./push-simple.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "Example:"
    echo "  ./push-simple.sh ghp_abc123xyz789"
    exit 1
fi

cd /Users/rebeccaalmond/Downloads/solowipe-main

# Configure pull strategy to merge (not rebase)
git config pull.rebase false

echo "Step 1: Pulling and merging with GitHub..."
echo ""

# Create temporary credential helper
CRED_FILE=$(mktemp)
cat > "$CRED_FILE" <<EOF
#!/bin/sh
echo username=beckialmond-rgb
echo password=$TOKEN
EOF
chmod +x "$CRED_FILE"

# Pull with merge
git -c credential.helper="$CRED_FILE" pull origin main --allow-unrelated-histories --no-edit

PULL_EXIT=$?

# Clean up
rm -f "$CRED_FILE"

if [ $PULL_EXIT -ne 0 ]; then
    echo ""
    echo "⚠️  Pull had issues. You may need to resolve conflicts."
    echo "   Check the output above for details."
    exit 1
fi

echo ""
echo "Step 2: Pushing to GitHub..."
echo ""

# Create credential helper again for push
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

