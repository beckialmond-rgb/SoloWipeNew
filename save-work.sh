#!/bin/bash
# Quick save script - saves your work to GitHub
# Usage: ./save-work.sh

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}💾 Saving your work...${NC}"

# Check if there are changes
if git diff --quiet && git diff --cached --quiet; then
    echo -e "${GREEN}✅ No changes to commit${NC}"
    exit 0
fi

# Get current branch
BRANCH=$(git branch --show-current)
echo -e " branch: ${BRANCH}"

# Add all changes
git add .

# Create commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MSG="WIP: $TIMESTAMP - Auto-save"

# Commit
if git commit -m "$COMMIT_MSG"; then
    echo -e "${GREEN}✅ Committed changes${NC}"
else
    echo -e "${RED}❌ Failed to commit${NC}"
    exit 1
fi

# Push to remote
if git push origin "$BRANCH"; then
    echo -e "${GREEN}✅ Pushed to origin/$BRANCH${NC}"
    echo -e "${GREEN}🎉 Your work is safe on GitHub!${NC}"
else
    echo -e "${YELLOW}⚠️  Commit created locally but push failed${NC}"
    echo -e "${YELLOW}   Your work is saved locally. Push manually when ready.${NC}"
    exit 1
fi





