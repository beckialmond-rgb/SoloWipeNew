#!/bin/bash
# Git safety configuration script
# Run this once to set up safe git defaults

echo "🔧 Setting up Git safety configuration..."

# Basic identity (update with your info)
git config --global user.name "Rebecca Almond"
git config --global user.email "rebeccaalmond@Rebeccas-MacBook-Pro.local"

# Safe push defaults
git config --global push.default simple
git config --global push.followTags true

# Helpful features
git config --global color.branch auto
git config --global color.status auto
git config --global color.diff auto

# Prevent accidental deletions
git config --global branch.autosetuprebase always

# Better merge behavior
git config --global merge.conflictstyle diff3

# Show branch in status
git config --global status.branch true

# Auto-setup tracking
git config --global branch.autoSetupMerge always

echo "✅ Git safety configuration complete!"
echo ""
echo "Current configuration:"
git config --list --global | grep -E "(user|push|color|branch|merge)"

