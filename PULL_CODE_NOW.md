# Pull Code from GitHub - Simple Method

## ✅ Working Command for zsh

Run this **exact command**, replacing `YOUR_TOKEN` with your actual GitHub token:

```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main && GIT_TOKEN=YOUR_TOKEN git -c credential.helper='!f() { echo username=beckialmond-rgb; echo password=$GIT_TOKEN; }; f' pull origin main --allow-unrelated-histories
```

**Example:**
If your token is `ghp_abc123xyz789`, run:
```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main && GIT_TOKEN=ghp_abc123xyz789 git -c credential.helper='!f() { echo username=beckialmond-rgb; echo password=$GIT_TOKEN; }; f' pull origin main --allow-unrelated-histories
```

---

## 📋 Step-by-Step

1. **Open Terminal**

2. **Copy this command** (don't run yet):
   ```bash
   cd /Users/rebeccaalmond/Downloads/solowipe-main && GIT_TOKEN=YOUR_TOKEN git -c credential.helper='!f() { echo username=beckialmond-rgb; echo password=$GIT_TOKEN; }; f' pull origin main --allow-unrelated-histories
   ```

3. **Replace `YOUR_TOKEN`** with your actual token (the `ghp_...` string)

4. **Paste and press Enter**

5. **Verify:**
   ```bash
   git status
   ```

---

## 🔍 Alternative: Two-Step Method

If the one-liner doesn't work, try this:

```bash
# Step 1: Set the token
export GIT_TOKEN=YOUR_TOKEN

# Step 2: Pull
cd /Users/rebeccaalmond/Downloads/solowipe-main
git -c credential.helper='!f() { echo username=beckialmond-rgb; echo password=$GIT_TOKEN; }; f' pull origin main --allow-unrelated-histories

# Step 3: Clear the token (optional, for security)
unset GIT_TOKEN
```

---

## ✅ After Pulling

Check everything worked:
```bash
git status
git fetch origin
```

---

**This should work!** The single quotes prevent zsh from interpreting the `!` character.

