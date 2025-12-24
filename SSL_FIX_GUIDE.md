# SSL/TLS Error Fix Guide

## Error: ERR_SSL_VERSION_OR_CIPHER_MISMATCH

This error indicates an SSL/TLS configuration issue with your Netlify deployment, not a code issue.

## Common Causes & Solutions

### 1. SSL Certificate Not Provisioned
**Problem:** Netlify hasn't provisioned an SSL certificate for your custom domain yet.

**Solution:**
1. Go to Netlify Dashboard → Your Site → **Domain settings**
2. Check if `solowipe.co.uk` is listed under **Custom domains**
3. If not added:
   - Click **Add custom domain**
   - Enter `solowipe.co.uk`
   - Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (can take a few minutes to hours)
5. Check **HTTPS** status - should show "Certificate provisioned"

### 2. DNS Not Properly Configured
**Problem:** DNS records aren't pointing to Netlify correctly.

**Solution:**
1. Check your DNS provider (where you bought solowipe.co.uk)
2. Ensure you have these DNS records:
   - **A Record** or **CNAME Record** pointing to Netlify
   - Netlify will provide the exact values in Domain settings
3. Common Netlify DNS values:
   - **A Record:** `75.2.60.5` (or check Netlify dashboard for current IP)
   - **CNAME:** Your site's Netlify subdomain (e.g., `your-site.netlify.app`)

### 3. SSL Certificate Provisioning In Progress
**Problem:** Certificate is still being provisioned.

**Solution:**
- Wait 5-60 minutes for Let's Encrypt certificate provisioning
- Check Netlify Dashboard → Domain settings → HTTPS status
- Status should change from "Provisioning" to "Certificate provisioned"

### 4. Force HTTPS Redirect
**Problem:** Site might be trying to use HTTP instead of HTTPS.

**Solution:** Add to `netlify.toml`:
```toml
[[redirects]]
  from = "http://solowipe.co.uk/*"
  to = "https://solowipe.co.uk/:splat"
  status = 301
  force = true

[[redirects]]
  from = "http://www.solowipe.co.uk/*"
  to = "https://solowipe.co.uk/:splat"
  status = 301
  force = true
```

### 5. Clear Browser Cache
**Solution:**
- Clear browser cache completely
- Try incognito/private window
- Try different browser
- Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

## Quick Checklist

- [ ] Domain added to Netlify Domain settings
- [ ] DNS records configured correctly
- [ ] SSL certificate status shows "Provisioned" (not "Provisioning")
- [ ] HTTPS redirect configured in netlify.toml
- [ ] Waited at least 5 minutes after DNS changes
- [ ] Cleared browser cache and tried incognito

## If Still Not Working

1. **Check Netlify Status:**
   - Go to Netlify Dashboard → Domain settings
   - Look for any error messages
   - Check HTTPS certificate status

2. **Verify DNS Propagation:**
   - Use https://dnschecker.org to verify DNS records are propagated globally
   - Check if your domain resolves to Netlify's IP

3. **Contact Netlify Support:**
   - If certificate won't provision after 24 hours
   - If DNS is correct but SSL still fails
   - Netlify support can manually provision certificates

4. **Temporary Workaround:**
   - Use the Netlify subdomain (e.g., `your-site.netlify.app`) which always has SSL
   - This works immediately while fixing custom domain SSL

## Testing

After fixing, test:
- `https://solowipe.co.uk` (should work)
- `http://solowipe.co.uk` (should redirect to HTTPS)
- `https://www.solowipe.co.uk` (if you have www subdomain)
