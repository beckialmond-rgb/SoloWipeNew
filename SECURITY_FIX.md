# Security Fix Required

## ⚠️ CRITICAL: Secrets were committed to git history

The `.env` file containing sensitive keys was accidentally committed to git and pushed to the remote repository.

### What was exposed:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key - public, but should be rotated)
- `VITE_SUPABASE_PROJECT_ID`
- `SERVICE_ROLE_KEY` (CRITICAL - admin key with full database access)

### Immediate Actions Required:

#### 1. Rotate your Supabase Service Role Key (URGENT)
   - Go to Supabase Dashboard → Project Settings → API
   - Revoke the current service_role key
   - Generate a new service_role key
   - Update it in:
     - Your local `.env` file
     - Supabase Edge Functions Secrets

#### 2. Clean git history to remove .env file

**Option A: Using git filter-repo (Recommended)**
```bash
# Install git-filter-repo if needed
pip install git-filter-repo

# Remove .env from all history
git filter-repo --path .env --invert-paths

# Force push to update remote (WARNING: rewrites history)
git push origin --force --all
```

**Option B: Using BFG Repo-Cleaner**
```bash
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin --force --all
```

**Option C: Manual rebase (if only a few commits)**
```bash
# Interactive rebase to edit commits
git rebase -i HEAD~5  # Adjust number based on commits with .env
# Mark commits for editing, remove .env file, continue
git push origin --force
```

#### 3. Verify .env is ignored
- ✅ `.env` is already in `.gitignore`
- ✅ `.env` has been removed from git tracking
- The file will remain locally but won't be tracked

#### 4. Update all environments
After rotating keys, update:
- Local `.env` file
- Netlify environment variables
- Supabase Edge Functions secrets

### Prevention:
- ✅ `.env` is now in `.gitignore`
- ✅ `.env` removed from git tracking
- Always verify `.gitignore` before committing sensitive files
- Use `git status` to check what's being committed
- Consider using `git-secrets` or `truffleHog` to scan for secrets

### Note:
The `.env` file has been removed from git tracking and will not be included in future commits. However, the secrets are still in git history and must be removed using one of the methods above.
