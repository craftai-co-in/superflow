#!/bin/bash
set -e

echo "=========================================="
echo "Post-deploy:  Cleaning up"
echo "=========================================="

cd /var/app/current

# Remove devDependencies to save space
echo "Pruning devDependencies..."
npm prune --production

echo "✅ Cleanup completed!"