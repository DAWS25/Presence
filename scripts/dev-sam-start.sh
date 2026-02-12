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



# Database connection parameters (with defaults matching compose.yaml)
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-DoNotUseDefaultPasswordsPlease}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-presence}"
PARAM_OVERRIDES="LambdaArchitecture=x86_64 DBUser=$DB_USER DBPassword=$DB_PASSWORD DBHost=$DB_HOST DBPort=$DB_PORT DBName=$DB_NAME"

echo "📦 Building SAM application..."
if command -v sam >/dev/null 2>&1; then
    sam build --parameter-overrides "$PARAM_OVERRIDES" --template "$TEMPLATE_PATH"
elif command -v devbox >/dev/null 2>&1; then
    cd "$DIR/presence_sam" && devbox run -- sam build --parameter-overrides "$PARAM_OVERRIDES" --template "$TEMPLATE_PATH"
else
    echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
    exit 1
fi

# Use the built template so dependencies are included
BUILT_TEMPLATE="$DIR/presence_sam/.aws-sam/build/template.yaml"

if command -v sam >/dev/null 2>&1; then
    sam local start-api --host 0.0.0.0 --port 10726 --docker-network presence_default --parameter-overrides "$PARAM_OVERRIDES" --template "$BUILT_TEMPLATE"
elif command -v devbox >/dev/null 2>&1; then
    cd "$DIR/presence_sam" && devbox run -- sam local start-api --host 0.0.0.0 --port 10726 --docker-network presence_default --parameter-overrides "$PARAM_OVERRIDES" --template "$BUILT_TEMPLATE"
else
    echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
    exit 1
fi
popd

#
popd