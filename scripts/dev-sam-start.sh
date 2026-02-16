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
PARAM_OVERRIDES="LambdaArchitecture=x86_64"

# Generate env-vars JSON for sam local (Fn::ImportValue can't resolve locally)
ENV_VARS_FILE="$DIR/presence_sam/.env-vars.json"
cat > "$ENV_VARS_FILE" <<EOF
{
  "PresenceFunction": {
    "DB_USER": "$DB_USER",
    "DB_PASSWORD": "$DB_PASSWORD",
    "DB_HOST": "$DB_HOST",
    "DB_PORT": "$DB_PORT",
    "DB_NAME": "$DB_NAME",
    "DB_IAM_AUTH": "false"
  }
}
EOF
echo "📝 Generated local env-vars at $ENV_VARS_FILE"

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
    sam local start-api --host 0.0.0.0 --port 10726 --docker-network devbox_net --parameter-overrides "$PARAM_OVERRIDES" --env-vars "$ENV_VARS_FILE" --template "$BUILT_TEMPLATE"
elif command -v devbox >/dev/null 2>&1; then
    cd "$DIR/presence_sam" && devbox run -- sam local start-api --host 0.0.0.0 --port 10726 --docker-network devbox_net --parameter-overrides "$PARAM_OVERRIDES" --env-vars "$ENV_VARS_FILE" --template "$BUILT_TEMPLATE"
else
    echo "Error: sam not found. Install AWS SAM CLI or use devbox." >&2
    exit 1
fi
popd

#
popd