# Git Commands for Apple Sign-In Removal

## Current Status
- **Current Branch:** `cursor/apple-sign-in-removal-f65e`
- **Target Branch:** `cursor/staging-all-changes-562b`
- **Working Tree:** Clean (no uncommitted changes)

## Git Commands to Execute

### Option 1: Merge Apple Removal Branch into Staging (Recommended)

```bash
# 1. Ensure you're on the Apple removal branch and it's up to date
git checkout cursor/apple-sign-in-removal-f65e
git pull origin cursor/apple-sign-in-removal-f65e

# 2. Switch to the staging branch
git checkout cursor/staging-all-changes-562b

# 3. Pull latest changes from remote staging branch
git pull origin cursor/staging-all-changes-562b

# 4. Merge the Apple removal branch into staging
git merge cursor/apple-sign-in-removal-f65e --no-edit

# 5. Push the merged changes to remote staging branch
git push origin cursor/staging-all-changes-562b
```

### Option 2: If You Want to Commit the Audit Report First

If you want to commit the audit report document before merging:

```bash
# 1. Stay on Apple removal branch
git checkout cursor/apple-sign-in-removal-f65e

# 2. Add the audit report
git add APPLE_SIGNIN_REMOVAL_AUDIT.md

# 3. Commit the audit report
git commit -m "docs: Add comprehensive Apple Sign-In removal audit report

- Verified codebase contains no Apple Sign-In implementation
- Documented all audit findings across frontend, backend, and config
- Confirmed codebase is clean and production-ready"

# 4. Push the commit
git push origin cursor/apple-sign-in-removal-f65e

# 5. Then follow Option 1 steps 2-5 to merge into staging
```

### Option 3: Fast-Forward Merge (If branches are linear)

```bash
# 1. Switch to staging branch
git checkout cursor/staging-all-changes-562b

# 2. Pull latest
git pull origin cursor/staging-all-changes-562b

# 3. Merge with fast-forward
git merge cursor/apple-sign-in-removal-f65e --ff-only

# 4. Push
git push origin cursor/staging-all-changes-562b
```

## Verification Commands

After merging, verify the merge was successful:

```bash
# Check current branch
git branch

# View recent commits
git log --oneline -5

# Check if staging branch includes Apple removal branch
git log --oneline --graph --all -10
```

## Important Notes

1. **No Code Changes:** Since the codebase was already clean of Apple Sign-In code, the merge will primarily add the audit documentation.

2. **Conflict Resolution:** If merge conflicts occur (unlikely), resolve them manually and then:
   ```bash
   git add .
   git commit -m "Merge: Resolve conflicts from Apple Sign-In removal audit"
   git push origin cursor/staging-all-changes-562b
   ```

3. **Backup:** Before merging, you may want to create a backup tag:
   ```bash
   git tag backup-before-apple-audit-merge
   git push origin backup-before-apple-audit-merge
   ```

## Expected Outcome

After executing these commands:
- ✅ Staging branch will include the Apple Sign-In removal audit documentation
- ✅ Codebase remains clean (no Apple Sign-In code)
- ✅ All changes synced to GitHub remote repository
- ✅ Ready for deployment/testing
