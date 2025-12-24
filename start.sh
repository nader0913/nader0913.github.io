#!/bin/bash

# Quick start script for the Multi-User Article Platform

echo "🚀 Starting Multi-User Article Platform..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python first."
    exit 1
fi

# Determine Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

echo "✅ Prerequisites check passed"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Start the API server in background
echo "📡 Starting API server on http://localhost:3000..."
cd server && node server.js &
SERVER_PID=$!
cd "$SCRIPT_DIR"

# Wait for server to start
sleep 2

# Start the frontend server
echo "🌐 Starting frontend server on http://localhost:8080..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Platform is ready!"
echo ""
echo "📝 Open your browser and visit:"
echo "   http://localhost:8080"
echo ""
echo "💡 Tips:"
echo "   • Create an account to get started"
echo "   • Your articles will be saved in server/users/"
echo "   • Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start frontend server (this will keep the script running)
$PYTHON_CMD -m http.server 8080

# Cleanup when script exits
trap "kill $SERVER_PID 2>/dev/null" EXIT
