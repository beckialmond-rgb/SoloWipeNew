#!/bin/bash
echo "=== Deployment Check ==="
echo ""
echo "Local commits:"
git log --oneline -3
echo ""
echo "Remote commits:"
git fetch origin 2>/dev/null
git log --oneline origin/main -3
echo ""
echo "Differences:"
git diff HEAD origin/main --stat | head -5
echo ""
echo "Build output exists:"
ls -lh dist/index.html dist/assets/index.js 2>/dev/null | head -2
