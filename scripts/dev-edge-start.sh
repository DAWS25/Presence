#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
pushd "$DIR"
# 

# Clean and rebuild Lambda@Edge function
pushd "$DIR/presence_edge"
TEMPLATE_PATH="$DIR/presence_edge/template.yaml"

echo "🧹 Cleaning Lambda@Edge build artifacts..."
rm -rf .aws-sam

echo "📦 Building Lambda@Edge function..."
if command -v sam >/dev/null 2>&1; then
    sam build --template "$TEMPLATE_PATH"
elif command -v devbox >/dev/null 2>&1; then
    cd "$DIR/presence_edge" && devbox run -- sam build --template "$TEMPLATE_PATH"
else
    echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
    exit 1
fi

# Use the built template so dependencies are included
BUILT_TEMPLATE="$DIR/presence_edge/.aws-sam/build/template.yaml"

if command -v sam >/dev/null 2>&1; then
    sam local start-lambda --host 0.0.0.0 --port 3343 --template "$BUILT_TEMPLATE"
elif command -v devbox >/dev/null 2>&1; then
    cd "$DIR/presence_edge" && devbox run -- sam local start-lambda --host 0.0.0.0 --port 3343 --template "$BUILT_TEMPLATE"
else
    echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
    exit 1
fi
popd

#
popd
