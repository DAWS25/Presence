#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
pushd "$DIR"
# 

# Clean and rebuild Lambda@Edge Root function
pushd "$DIR/presence_edge_root"
TEMPLATE_PATH="$DIR/presence_edge_root/template.yaml"

echo "🧹 Cleaning Lambda@Edge Root build artifacts..."
rm -rf .aws-sam

echo "📦 Building Lambda@Edge Root function..."
if command -v sam >/dev/null 2>&1; then
    sam build --template "$TEMPLATE_PATH"
elif command -v devbox >/dev/null 2>&1; then
    cd "$DIR/presence_edge_root" && devbox run -- sam build --template "$TEMPLATE_PATH"
else
    echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
    exit 1
fi

# Use the built template so dependencies are included
BUILT_TEMPLATE="$DIR/presence_edge_root/.aws-sam/build/template.yaml"

if command -v sam >/dev/null 2>&1; then
    sam local start-lambda --host 0.0.0.0 --port 17668 --docker-network devbox_net --template "$BUILT_TEMPLATE"
elif command -v devbox >/dev/null 2>&1; then
    cd "$DIR/presence_edge_root" && devbox run -- sam local start-lambda --host 0.0.0.0 --port 17668 --docker-network devbox_net --template "$BUILT_TEMPLATE"
else
    echo "Error: sam not found" >&2
    exit 1
fi

popd
popd
