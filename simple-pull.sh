#!/bin/bash

# Simple pull script that works in zsh
# Usage: ./simple-pull.sh YOUR_TOKEN

TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "Usage: ./simple-pull.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "Example:"
    echo "  ./simple-pull.sh ghp_abc123xyz789"
    exit 1
fi

cd /Users/rebeccaalmond/Downloads/solowipe-main

# Create a temporary credential helper script
CRED_HELPER=$(mktemp)
cat > "$CRED_HELPER" <<EOF
#!/bin/sh
echo username=beckialmond-rgb
echo password=$TOKEN
EOF

chmod +x "$CRED_HELPER"

# Use the credential helper
git -c credential.helper="$CRED_HELPER" pull origin main --allow-unrelated-histories

# Clean up
rm -f "$CRED_HELPER"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Code pulled from GitHub"
    echo ""
    git fetch origin
    git status
else
    echo ""
    echo "❌ Pull failed. Check your token."
    exit 1
fi

