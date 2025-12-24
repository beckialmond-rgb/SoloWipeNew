#!/bin/bash
# Deploy GoCardless Callback Function with Access Token
# Replace YOUR_TOKEN_HERE with your actual access token

SUPABASE_ACCESS_TOKEN="YOUR_TOKEN_HERE" npx supabase functions deploy gocardless-callback

