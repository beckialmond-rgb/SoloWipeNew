# Simple Redirect URI Check

## 🔍 Quick Check - 30 Seconds

### Step 1: Check Browser Console

1. Open your browser console (F12)
2. **On your app** (where you click "Connect GoCardless")
3. Run this:

```javascript
const isProd = window.location.hostname === 'solowipe.co.uk' || window.location.hostname === 'www.solowipe.co.uk';
const uri = isProd ? 'https://solowipe.co.uk/gocardless-callback' : `${window.location.origin}/gocardless-callback`;
console.log('Redirect URI:', uri);
```

### Step 2: Verify in GoCardless Dashboard

1. Go to GoCardless Dashboard (sandbox or live based on your environment)
2. Settings → API → Redirect URIs
3. **Does the URI from Step 1 match EXACTLY?**

### Step 3: If Different

Update the redirect URI in GoCardless Dashboard to match exactly what's shown in Step 1.

---

**That's it! The Optimizely warnings are unrelated - ignore them.**





