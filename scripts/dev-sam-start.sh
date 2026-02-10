#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
pushd "$DIR"
# 

# Clean and rebuild SAM application
pushd "$DIR/presence_sam"
TEMPLATE_PATH="$DIR/presence_sam/template.yaml"

echo "🧹 Cleaning SAM build artifacts..."
rm -rf .aws-sam

REQ_FILE="$DIR/presence_sam/requirements.txt"
VENV_DIR="$DIR/presence_sam/.venv"
if [ -f "$REQ_FILE" ]; then
    echo "📦 Installing Python requirements..."
    if [ ! -d "$VENV_DIR" ]; then
        python3 -m venv "$VENV_DIR"
    fi
    "$VENV_DIR/bin/python" -m pip install -r "$REQ_FILE"
else
    echo "⚠️  Requirements file not found at $REQ_FILE"
fi

echo "📦 Building SAM application..."
if command -v sam >/dev/null 2>&1; then
    sam build --parameter-overrides "LambdaArchitecture=x86_64" --template "$TEMPLATE_PATH"
elif command -v devbox >/dev/null 2>&1; then
    cd "$DIR/presence_sam" && devbox run -- sam build --parameter-overrides "LambdaArchitecture=x86_64" --template "$TEMPLATE_PATH"
else
    echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
    exit 1
fi

# Use the built template so dependencies are included
BUILT_TEMPLATE="$DIR/presence_sam/.aws-sam/build/template.yaml"

if command -v sam >/dev/null 2>&1; then
    sam local start-api --host 0.0.0.0 --port 10726 --parameter-overrides "LambdaArchitecture=x86_64" --template "$BUILT_TEMPLATE"
elif command -v devbox >/dev/null 2>&1; then
    cd "$DIR/presence_sam" && devbox run -- sam local start-api --host 0.0.0.0 --port 10726 --parameter-overrides "LambdaArchitecture=x86_64" --template "$BUILT_TEMPLATE"
else
    echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
    exit 1
fi
popd

#
popd