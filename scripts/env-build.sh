#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
# 
log_ts() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
log_ts "📦 Packaging Presence for deployment..."
WEB_DIR="$DIR/presence_web"

# Clean and prepare target folder
log_ts "📂 Preparing target folder..."
rm -rf $WEB_DIR/target/*
mkdir -p $WEB_DIR/target

# Copy src files to target
cp -a $WEB_DIR/src/* $WEB_DIR/target/

log_ts "🔧 Building SAM API function..."
pushd $DIR/presence_sam
sam build --use-container
popd
log_ts "Done building"
