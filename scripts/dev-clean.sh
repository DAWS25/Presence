#!/usr/bin/env bash
#
# Clean script - kills containers, prunes resources, removes artifacts
#

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd "$DIR/.."

echo "🧹 Starting cleanup..."

# Kill all running containers
echo "🛑 Stopping all containers..."
docker compose down -v 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Prune Docker system resources
echo "🗑️  Pruning Docker system resources..."
docker system prune -a -f --volumes

# Remove Python artifacts
echo "🗑️  Removing Python artifacts..."
rm -rf .venv
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Remove Node artifacts
echo "🗑️  Removing Node artifacts..."
rm -rf presence_web/target
rm -rf presence_web/node_modules
rm -rf presence_lib/node_modules

# Remove SAM artifacts
echo "🗑️  Removing SAM artifacts..."
rm -rf presence_sam/.aws-sam
rm -rf presence_sam/build

# Remove data volumes
echo "🗑️  Removing local data directories..."
rm -rf .data/postgres
rm -rf .data/nginx
rm -rf .data

# Clean logs
echo "🗑️  Removing logs..."
rm -f devbox.log

echo "✅ Cleanup complete!"
popd
