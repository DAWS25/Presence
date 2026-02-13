#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
pushd "$DIR" 
log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
log "script [$0] started"
# 

TENANT_ID=${TENANT_ID:-"presence-env"} 

# Validate required environment variables
if [ -z "$TENANT_ID" ]; then
    echo "❌ TENANT_ID is required"
    exit 1
fi

# Get AWS region
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo "Using AWS region: $AWS_REGION"

# Deploy VPC with 3 public + 3 isolated subnets
log "Deploying $TENANT_ID-net-vpc stack..."
aws cloudformation deploy \
    --stack-name $TENANT_ID-net-vpc \
    --template-file $DIR/presence_cform/net-vpc.cform.yaml \
    --parameter-overrides \
        EnvId="$TENANT_ID" \
    --no-fail-on-empty-changeset
log "✓ VPC deployed"

# Deploy database cluster (VPC and subnets imported via cross-stack references from $TENANT_ID net-vpc stack)
DB_MASTER_USERNAME=${DB_MASTER_USERNAME:-postgres}
DB_NAME=${DB_NAME:-presence}
log "Deploying $TENANT_ID-db-cluster stack..."
aws cloudformation deploy \
    --stack-name $TENANT_ID-db-cluster \
    --template-file $DIR/presence_cform/db-cluster.cfom.yaml \
    --parameter-overrides \
        EnvId="$TENANT_ID" \
        DatabaseName="$DB_NAME" \
        MasterUsername="$DB_MASTER_USERNAME" \
    --no-fail-on-empty-changeset
log "✓ Database cluster deployed"

popd
log "✅ Account-level deployment for $TENANT_ID completed!"
