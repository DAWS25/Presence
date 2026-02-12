#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
# 
echo "📦 Packaging Presence for deployment..."
WEB_DIR="$DIR/presence_web"

# Clean and prepare target folder
echo "📂 Preparing target folder..."
rm -rf $WEB_DIR/target/*
mkdir -p $WEB_DIR/target

# Copy src files to target
cp -a $WEB_DIR/src/* $WEB_DIR/target/

echo "🔧 Building SAM API function..."
pushd $DIR/presence_sam
sam build --use-container
popd
echo "Done"
