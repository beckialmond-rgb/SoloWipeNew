# Check Actual Redirect URI Being Sent

## 🔍 Quick Diagnostic

Run this in your browser console **when you're on your app** (before clicking Connect):

```javascript
// This shows what redirect URI will be used
const currentHostname = window.location.hostname;
const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
const redirectUrl = isProduction 
  ? 'https://solowipe.co.uk/gocardless-callback'
  : `${window.location.origin}/gocardless-callback`;

console.log('=== REDIRECT URI CHECK ===');
console.log('Current hostname:', currentHostname);
console.log('Is production:', isProduction);
console.log('Redirect URI that will be sent:', redirectUrl);
console.log('=== END CHECK ===');
```

**Copy the exact redirect URI** shown and verify it matches what's in GoCardless Dashboard.

## 📋 Checklist

- [ ] Run the script above
- [ ] Copy the exact redirect URI shown
- [ ] Go to GoCardless Dashboard
- [ ] Verify this EXACT URI is registered (character-for-character)
- [ ] Check for trailing slash differences
- [ ] Check for protocol differences (http vs https)
- [ ] Check for domain differences (www vs non-www)

