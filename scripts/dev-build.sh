#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
# 
echo "📦 Packaging Presence for development..."
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

# Build SAM application
echo "📦 Building SAM application..."
pushd "$DIR/presence_sam"
TEMPLATE_PATH="$DIR/presence_sam/template.yaml"
if command -v sam >/dev/null 2>&1; then
  sam build --parameter-overrides "LambdaArchitecture=x86_64" --template "$TEMPLATE_PATH"
elif command -v devbox >/dev/null 2>&1; then
  cd "$DIR/presence_sam" && devbox run -- sam build --parameter-overrides "LambdaArchitecture=x86_64" --template "$TEMPLATE_PATH"
else
  echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
  exit 1
fi
popd

# Build Lambda@Edge auth function
echo "📦 Building Lambda@Edge auth function..."
pushd "$DIR/presence_edge_auth"
if command -v sam >/dev/null 2>&1; then
  sam build
elif command -v devbox >/dev/null 2>&1; then
  devbox run -- sam build
else
  echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
  exit 1
fi
popd

# Build Lambda@Edge CORS function
echo "📦 Building Lambda@Edge CORS function..."
pushd "$DIR/presence_edge_cors"
if command -v sam >/dev/null 2>&1; then
  sam build
elif command -v devbox >/dev/null 2>&1; then
  devbox run -- sam build
else
  echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
  exit 1
fi
popd

# Build Lambda@Edge healthcheck function
echo "📦 Building Lambda@Edge healthcheck function..."
pushd "$DIR/presence_edge_hc"
if command -v sam >/dev/null 2>&1; then
  sam build
elif command -v devbox >/dev/null 2>&1; then
  devbox run -- sam build
else
  echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
  exit 1
fi
popd
  exit 1
fi
popd

echo "Done"
