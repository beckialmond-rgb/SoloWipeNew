#!/bin/bash

# Test the GoCardless Connect function directly
# This will help us see what the function actually returns

echo "Testing OPTIONS request (CORS preflight)..."
curl -X OPTIONS \
  "https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-connect" \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  -v \
  -w "\n\nHTTP Status: %{http_code}\n"

echo -e "\n\n---\n\n"

echo "Testing GET request (to see if function is reachable)..."
curl -X GET \
  "https://owqjyaiptexqwafzmcwy.supabase.co/functions/v1/gocardless-connect" \
  -v \
  -w "\n\nHTTP Status: %{http_code}\n"

