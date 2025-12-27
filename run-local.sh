#!/bin/bash

# Local Development Environment Launcher
# Runs both API server and dev server in parallel

echo "🚀 Starting Pluma Local Development Environment..."
echo ""

# Start API server in background
echo "Starting API server on port 3000..."
npm run api &
API_PID=$!

# Wait a moment for API to start
sleep 2

# Start dev server in background
echo "Starting dev server on port 8080..."
npm run dev &
DEV_PID=$!

echo ""
echo "✅ Both servers started!"
echo ""
echo "📍 Open: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $API_PID $DEV_PID; exit" INT

# Wait for both processes
wait
