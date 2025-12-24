#!/bin/bash

# Complete commit and push script
# Commits all critical changes and pushes to GitHub
# Usage: ./commit-all-and-push.sh YOUR_GITHUB_TOKEN

TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "Usage: ./commit-all-and-push.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "Example:"
    echo "  ./commit-all-and-push.sh ghp_abc123xyz789"
    exit 1
fi

cd /Users/rebeccaalmond/Downloads/solowipe-main

echo "🔍 Full Deployment Audit"
echo "========================"
echo ""

# Show current status
echo "📊 Current Status:"
git status --short
echo ""

# Check what needs to be committed
CRITICAL_FILES=""
OPTIONAL_FILES=""

if git diff --quiet HEAD -- src/App.tsx 2>/dev/null; then
    echo "✅ src/App.tsx: Already committed"
else
    echo "⚠️  src/App.tsx: NEEDS COMMIT (CRITICAL)"
    CRITICAL_FILES="$CRITICAL_FILES src/App.tsx"
fi

if git diff --quiet HEAD -- push-simple.sh 2>/dev/null; then
    echo "✅ push-simple.sh: Already committed"
else
    echo "ℹ️  push-simple.sh: Modified (optional)"
    OPTIONAL_FILES="$OPTIONAL_FILES push-simple.sh"
fi

echo ""

if [ -z "$CRITICAL_FILES" ] && [ -z "$OPTIONAL_FILES" ]; then
    echo "✅ No changes to commit!"
    echo ""
    echo "Checking if there are unpushed commits..."
    if git log origin/main..HEAD --oneline | grep -q .; then
        echo "⚠️  You have local commits that need to be pushed"
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
        
        git -c credential.helper="$CRED_FILE" push origin main
        PUSH_EXIT=$?
        rm -f "$CRED_FILE"
        
        if [ $PUSH_EXIT -eq 0 ]; then
            echo ""
            echo "✅ Success! All commits pushed to GitHub"
        else
            echo ""
            echo "❌ Push failed. Check the error above."
            exit 1
        fi
    else
        echo "✅ Everything is up to date!"
    fi
    exit 0
fi

# Stage critical files
if [ -n "$CRITICAL_FILES" ]; then
    echo "📦 Staging critical files..."
    git add $CRITICAL_FILES
    echo "✅ Staged: $CRITICAL_FILES"
fi

# Ask about optional files
if [ -n "$OPTIONAL_FILES" ]; then
    echo ""
    read -p "Include optional file (push-simple.sh)? [y/N] " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 Staging optional files..."
        git add $OPTIONAL_FILES
        echo "✅ Staged: $OPTIONAL_FILES"
    fi
fi

echo ""
echo "📝 Committing changes..."

# Create commit message
if [ -n "$CRITICAL_FILES" ]; then
    COMMIT_MSG="feat: Add Landing page route for microsite"
    if [ -n "$OPTIONAL_FILES" ] && git diff --cached --quiet -- push-simple.sh 2>/dev/null; then
        COMMIT_MSG="$COMMIT_MSG and update push script"
    fi
else
    COMMIT_MSG="chore: Update helper scripts"
fi

git commit -m "$COMMIT_MSG"

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
    echo "📋 Summary:"
    git log --oneline -1
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

