#!/bin/bash

echo "Starting build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the React app
echo "Building React app..."
npm run build

# Check if build was successful
if [ -d "build" ]; then
    echo "✅ Build successful! Build directory created."
    ls -la build/
else
    echo "❌ Build failed! Build directory not found."
    exit 1
fi

echo "Build process completed!" 