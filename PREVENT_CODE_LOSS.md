# 🛡️ How to Prevent Code Loss - Best Practices Guide

## What Happened & Why

**What Happened:**
- You had 4 days of local work
- When merging with GitHub, conflicts were resolved by accepting remote versions
- This overwrote your local changes

**Root Cause:**
- Local work wasn't pushed to GitHub before merging
- Merge conflicts were resolved by accepting remote versions
- No backup strategy in place

---

## ✅ Prevention Strategies

### 1. Commit and Push Frequently ⭐ **MOST IMPORTANT**

**The Golden Rule:** Never let more than 1 day of work go uncommitted and unpushed.

#### Daily Workflow:
```bash
# At the end of each day (or several times per day):
git add .
git commit -m "WIP: [describe what you worked on]"
git push origin main

# Or use a feature branch:
git checkout -b feature/my-work-today
git add .
git commit -m "WIP: [describe work]"
git push origin feature/my-work-today
```

#### Quick Push Script:
Create a simple script to push your work:
```bash
#!/bin/bash
# save-work.sh
git add .
git commit -m "WIP: $(date '+%Y-%m-%d %H:%M') - Auto-save"
git push origin main
echo "✅ Work saved to GitHub!"
```

**Make it executable:**
```bash
chmod +x save-work.sh
```

**Use it regularly:**
```bash
./save-work.sh
```

---

### 2. Use Feature Branches (Recommended)

**Never work directly on `main` branch!**

#### Safe Workflow:
```bash
# Start new work
git checkout -b feature/my-feature-name
# ... do your work ...
git add .
git commit -m "feat: Add my feature"
git push origin feature/my-feature-name

# When ready, merge to main
git checkout main
git pull origin main
git merge feature/my-feature-name
# Resolve conflicts carefully!
git push origin main
```

**Benefits:**
- Your work is safe on a separate branch
- Can't accidentally overwrite main
- Easy to review before merging
- Can delete branch if something goes wrong

---

### 3. Always Pull Before Merging

**Before any merge, always pull latest changes:**

```bash
# ALWAYS do this first:
git checkout main
git pull origin main

# Then merge your work
git merge your-branch
# Review conflicts carefully!
```

**Why:**
- Ensures you have latest remote changes
- Reduces merge conflicts
- Makes conflict resolution easier

---

### 4. Resolve Conflicts Carefully

**When you see conflicts, DON'T just accept one side!**

#### Safe Conflict Resolution:
```bash
# 1. See what files have conflicts
git status

# 2. Open each conflicted file
# Look for markers: <<<<<<< ======= >>>>>>>

# 3. Manually review and merge:
# - Keep your changes where needed
# - Keep remote changes where needed
# - Combine both when appropriate

# 4. After resolving:
git add <resolved-file>
git commit -m "Merge: Resolved conflicts carefully"
```

#### Use a Merge Tool:
```bash
# Configure a visual merge tool
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# Use it when conflicts occur
git mergetool
```

---

### 5. Create Regular Backups

#### Option A: Multiple Remotes (Recommended)
```bash
# Add a backup remote (GitHub, GitLab, etc.)
git remote add backup https://github.com/your-username/backup-repo.git

# Push to both remotes
git push origin main
git push backup main
```

#### Option B: Automated Local Backups
Create a backup script:
```bash
#!/bin/bash
# backup-to-external.sh
BACKUP_DIR="$HOME/backups/solowipe-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo "✅ Backed up to: $BACKUP_DIR"
```

#### Option C: Use Git Tags for Milestones
```bash
# Tag important milestones
git tag -a v1.0-working -m "Working version before major changes"
git push origin v1.0-working

# Can always return to this point:
git checkout v1.0-working
```

---

### 6. Use Git Stash for Quick Saves

**When you need to switch branches quickly:**
```bash
# Save current work without committing
git stash push -m "WIP: My current work"

# Switch branches, do other work
git checkout other-branch

# Come back and restore
git checkout original-branch
git stash pop
```

**List your stashes:**
```bash
git stash list
```

---

### 7. Set Up Pre-Push Hooks

**Prevent pushing without commits:**
Create `.git/hooks/pre-push`:
```bash
#!/bin/bash
# Prevent force push to main
protected_branch='main'
while read local_ref local_sha remote_ref remote_sha
do
  if [[ "$remote_ref" == *"$protected_branch"* ]]; then
    if [[ "$local_sha" = "0000000000000000000000000000000000000000" ]]; then
      echo "❌ Deleting main branch is not allowed!"
      exit 1
    fi
  fi
done
exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-push
```

---

### 8. Configure Git for Safety

#### Set up your identity:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### Enable helpful features:
```bash
# Show branch in prompt
git config --global color.branch auto
git config --global color.status auto

# Create backups when deleting branches
git config --global branch.autosetuprebase always
```

#### Prevent accidental force push:
```bash
# Add to .gitconfig:
[push]
  default = simple
  followTags = true
```

---

### 9. Daily Checklist

**Before ending your workday:**
- [ ] Commit all changes: `git add . && git commit -m "..."`  
- [ ] Push to remote: `git push origin main`  
- [ ] Verify push succeeded: `git log origin/main`  
- [ ] Create a backup tag if it's a milestone: `git tag backup-YYYY-MM-DD`  

**Before starting work:**
- [ ] Pull latest changes: `git pull origin main`  
- [ ] Check status: `git status`  
- [ ] Create a feature branch if working on new feature  

**Before merging:**
- [ ] Pull latest: `git pull origin main`  
- [ ] Review what you're merging: `git diff main your-branch`  
- [ ] Resolve conflicts manually (don't auto-accept)  
- [ ] Test after merge  
- [ ] Push merged changes  

---

### 10. Emergency Recovery Procedures

**If you lose work again:**

#### Check Git Reflog (First Step):
```bash
# See recent git operations
git reflog

# Find the commit before you lost work
git checkout <commit-hash>

# Create recovery branch
git checkout -b recovery-<date>
```

#### Check for Stashes:
```bash
git stash list
git stash show -p stash@{0}
```

#### Check Dangling Commits:
```bash
git fsck --lost-found
# Review the commits found
```

#### Check Other Branches:
```bash
git branch -a
git log --all --oneline
```

---

## 🚀 Quick Setup Script

Run this to set up safety features:

```bash
#!/bin/bash
# setup-git-safety.sh

# Configure git
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
git config --global push.default simple
git config --global init.defaultBranch main

# Create backup script
cat > save-work.sh << 'EOF'
#!/bin/bash
git add .
git commit -m "WIP: $(date '+%Y-%m-%d %H:%M') - Auto-save"
git push origin main
echo "✅ Work saved!"
EOF

chmod +x save-work.sh
echo "✅ Safety features configured!"
echo "💡 Use './save-work.sh' to quickly save your work"
```

---

## 📋 Recommended Workflow

### For Daily Work:

```bash
# Morning: Start fresh
git checkout main
git pull origin main
git checkout -b feature/today-work

# During day: Commit frequently
git add .
git commit -m "WIP: Progress on feature"
git push origin feature/today-work

# End of day: Save everything
git add .
git commit -m "End of day: [summary]"
git push origin feature/today-work

# When feature is complete: Merge carefully
git checkout main
git pull origin main
git merge feature/today-work
# Review conflicts!
git push origin main
```

---

## 🎯 Key Takeaways

1. **Commit and push daily** - Never let work sit uncommitted
2. **Use feature branches** - Never work directly on main
3. **Pull before merging** - Always get latest changes first
4. **Resolve conflicts manually** - Don't auto-accept one side
5. **Create backups** - Multiple remotes or local backups
6. **Use tags for milestones** - Easy to return to working states
7. **Check reflog if lost** - Git keeps history of operations

---

## 💡 Pro Tips

- **Use GitHub Desktop or VS Code Git UI** - Easier to see what you're doing
- **Enable GitHub Actions** - Automatically backup on push
- **Use GitLab or Bitbucket** - Alternative remotes for backup
- **Set up automated backups** - Cron job to backup daily
- **Review before pushing** - `git diff` to see what you're pushing

---

**Remember:** Git is designed to never lose data. If you commit and push regularly, your work is always safe! 🛡️





