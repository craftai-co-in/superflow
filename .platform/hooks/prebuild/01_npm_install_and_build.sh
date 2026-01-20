#!/bin/bash
set -e

echo "=========================================="
echo "Custom Build Hook:  Installing dependencies"
echo "=========================================="

# Install ALL dependencies
echo "Running npm install..."
npm install --legacy-peer-deps

echo "=========================================="
echo "Building client..."
echo "=========================================="
npm run build:client

echo "=========================================="
echo "Building server..."
echo "=========================================="
npm run build:server

echo "=========================================="
echo "✅ Build completed successfully!"
echo "=========================================="