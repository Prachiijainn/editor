#!/bin/bash

echo "🚀 Starting deployment process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if react-scripts is available
if ! npm list react-scripts; then
    echo "❌ react-scripts not found, installing..."
    npm install react-scripts
fi

# Build the React app
echo "🔨 Building React app..."
npm run build

# Check if build was successful
if [ -d "build" ]; then
    echo "✅ Build successful! Build directory created."
    echo "📁 Build contents:"
    ls -la build/
else
    echo "❌ Build failed! Build directory not found."
    echo "🔍 Checking for errors..."
    exit 1
fi

echo "🎉 Deployment process completed!" 