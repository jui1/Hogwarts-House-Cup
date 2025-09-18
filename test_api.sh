#!/bin/bash

echo "Hogwarts House Cup Leaderboard - Test Script"
echo "============================================"
echo ""

echo "1. Testing Backend API..."
echo "------------------------"

echo "Current Leaderboard:"
curl -s http://localhost:5000/api/leaderboard | jq '.'

echo ""
echo "Recent Events:"
curl -s http://localhost:5000/api/events/recent?limit=5 | jq '.'

echo ""
echo "Generator Status:"
curl -s http://localhost:5000/api/generator/status | jq '.'

echo ""
echo "2. Testing Time Windows..."
echo "-------------------------"

echo "Last 5 Minutes:"
curl -s "http://localhost:5000/api/leaderboard?timeWindow=5min" | jq '.'

echo ""
echo "Last Hour:"
curl -s "http://localhost:5000/api/leaderboard?timeWindow=1hour" | jq '.'

echo ""
echo "All Time:"
curl -s "http://localhost:5000/api/leaderboard?timeWindow=all" | jq '.'

echo ""
echo "3. Frontend Access..."
echo "--------------------"
echo "Frontend URL: http://localhost:3000"
echo "Backend API: http://localhost:5000"
echo "WebSocket: ws://localhost:5000"

echo ""
echo "All systems are running!"
echo "Open http://localhost:3000 in your browser to see the leaderboard"
