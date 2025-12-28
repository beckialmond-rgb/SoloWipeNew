#!/bin/bash

# Kill any existing Vite processes
echo "Stopping any existing dev servers..."
pkill -f "vite" || true
sleep 2

# Get local IP address
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo ""
echo "=========================================="
echo "Starting SoloWipe Dev Server"
echo "=========================================="
echo ""
echo "Your computer's IP address: $IP"
echo ""
echo "To access from mobile device:"
echo "  http://$IP:8080"
echo ""
echo "Make sure your mobile device is on the same WiFi network!"
echo ""
echo "=========================================="
echo ""

# Start the dev server
npm run dev





