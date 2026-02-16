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

# Replace environment variables in HTML files
echo "🔧 Substituting environment variables..."
ENVSUBST_VARS=(GOOGLE_CLIENT_ID)
for var in "${ENVSUBST_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required variable $var is not set" >&2
        exit 1
    fi
done
envsubst '$GOOGLE_CLIENT_ID' < $WEB_DIR/src/app/app.html > $WEB_DIR/target/app/app.html

echo "🔧 Building SAM API function..."
pushd $DIR/presence_sam
sam build
popd

echo "🔧 Building Lambda@Edge auth function..."
pushd $DIR/presence_edge_auth
sam build
popd

echo "🔧 Building Lambda@Edge CORS function..."
pushd $DIR/presence_edge_cors
sam build
popd

echo "🔧 Building Lambda@Edge healthcheck function..."
pushd $DIR/presence_edge_hc
sam build
popd

echo "🔧 Building Lambda@Edge root redirect function..."
pushd $DIR/presence_edge_root
sam build
popd

echo "Done"
