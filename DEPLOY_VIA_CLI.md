# Deploy GoCardless Callback Function via CLI

## Quick Steps

### 1. Open Terminal
Open Terminal on your Mac (Applications → Utilities → Terminal)

### 2. Navigate to Project
```bash
cd /Users/rebeccaalmond/Downloads/solowipe-main
```

### 3. Login to Supabase
```bash
npx supabase login
```
- This will open a browser window
- Sign in to your Supabase account
- Authorize the CLI

### 4. Link Project (if needed)
Your project ID is already in the config, but you may need to link it:
```bash
npx supabase link --project-ref owqjyaiptexqwafzmcwy
```

### 5. Deploy the Function
```bash
npx supabase functions deploy gocardless-callback
```

### 6. Verify Deployment
You should see:
```
Deploying function gocardless-callback...
Function gocardless-callback deployed successfully
```

---

## Alternative: Using Access Token

If login doesn't work, you can use an access token:

### 1. Get Access Token
- Go to: https://supabase.com/dashboard/account/tokens
- Click "Generate new token"
- Copy the token

### 2. Deploy with Token
```bash
export SUPABASE_ACCESS_TOKEN="your-token-here"
npx supabase functions deploy gocardless-callback
```

Or in one line:
```bash
SUPABASE_ACCESS_TOKEN="your-token-here" npx supabase functions deploy gocardless-callback
```

---

## After Deployment

1. Wait 30-60 seconds
2. Go to your app → Settings
3. Try connecting GoCardless again
4. The CORS error should be gone!

