#!/bin/bash

echo "Hogwarts House Cup Leaderboard - Setup Script"
echo "============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "Prerequisites check passed"
echo ""

echo "Installing dependencies..."
echo "--------------------------"

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd client
npm install
cd ..

echo ""
echo "Setting up database..."
echo "----------------------"

# Generate Prisma client and create database
npx prisma generate
npx prisma db push

echo ""
echo "Starting the application..."
echo "---------------------------"

echo "Starting backend server..."
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

echo "Starting frontend development server..."
cd client
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "Application started successfully!"
echo "================================="
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:5000"
echo "WebSocket: ws://localhost:5000"
echo ""
echo "To start generating data, click 'Start Live Updates' in the UI"
echo "or run: curl -X POST http://localhost:5000/api/generator/start"
echo ""
echo "To stop the application, press Ctrl+C"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping application..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Application stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
