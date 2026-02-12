#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
# 
echo "📦 Packaging Presence for deployment..."
WEB_DIR="$DIR/presence_web"
# Check if node_modules is installed
if [ ! -d "$WEB_DIR/node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    cd "$WEB_DIR"
    npm install
fi

# Clean and prepare target folder
echo "📂 Preparing target folder..."
rm -rf $WEB_DIR/target/*
mkdir -p $WEB_DIR/target

# Copy src files to target
cp -a $WEB_DIR/src/* $WEB_DIR/target/

# Copy node_modules to target (required for Bootstrap and face-api.js)
cp -a $WEB_DIR/node_modules $WEB_DIR/target/

echo "🔧 Building SAM API function..."
pushd $DIR/presence_sam
sam build
popd
echo "Done"
