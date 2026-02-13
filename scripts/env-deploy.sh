#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
log "script [$0] started"
# 

# Validate required environment variables
if [ -z "$ENV_ID" ]; then
    echo "❌ ENV_ID is required"
    exit 1
fi

if [ -z "$DOMAIN_NAME" ]; then
    echo "❌ DOMAIN_NAME is required"
    exit 1
fi

if [ -z "$TARGET_ACCOUNT_ID" ]; then
    echo "❌ TARGET_ACCOUNT_ID is required"
    exit 1
fi

# Build
log "🔨 Building environment for $ENV_ID..."
source "$SCRIPT_DIR/env-build.sh"

CURRENT_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ "$CURRENT_ACCOUNT_ID" != "$TARGET_ACCOUNT_ID" ]; then
    echo "❌ AWS account ID mismatch! Expected $TARGET_ACCOUNT_ID but got $CURRENT_ACCOUNT_ID"
    exit 1
fi

# Get AWS region
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo "Using AWS region: $AWS_REGION"

# Deploy web-zone stack if ZONE_ID is not defined
if [ -z "$ZONE_ID" ]; then
    echo "ZONE_ID not defined, deploying $ENV_ID-web-zone stack..."
    aws cloudformation deploy \
        --stack-name $ENV_ID-web-zone \
        --template-file $DIR/presence_cform/web-zone.cform.yaml \
        --parameter-overrides \
            EnvId="$ENV_ID" \
            DomainName="$DOMAIN_NAME" \
        --no-fail-on-empty-changeset
    
    ZONE_ID=$(aws cloudformation describe-stacks \
        --stack-name $ENV_ID-web-zone \
        --query "Stacks[0].Outputs[?OutputKey=='HostedZoneId'].OutputValue" \
        --output text)
else
    echo "✓ ZONE_ID already defined: $ZONE_ID"
fi

# Deploy web-certificate stack if CERTIFICATE_ARN is not defined
if [ -z "$CERTIFICATE_ARN" ]; then
    echo "CERTIFICATE_ARN not defined, deploying $ENV_ID-web-certificate stack..."
    aws cloudformation deploy \
        --stack-name $ENV_ID-web-certificate \
        --template-file $DIR/presence_cform/web-certificate.cform.yaml \
        --parameter-overrides \
            EnvId="$ENV_ID" \
            DomainName="$DOMAIN_NAME" \
            HostedZoneId="$ZONE_ID" \
        --no-fail-on-empty-changeset
    
    CERTIFICATE_ARN=$(aws cloudformation describe-stacks \
        --stack-name $ENV_ID-web-certificate \
        --query "Stacks[0].Outputs[?OutputKey=='CertificateArn'].OutputValue" \
        --output text)
else
    echo "✓ CERTIFICATE_ARN already defined: $CERTIFICATE_ARN"
fi

log "Deploying web-resources stack..."
aws cloudformation deploy \
    --stack-name $ENV_ID-web-resources \
    --template-file $DIR/presence_cform/web-resources.cform.yaml \
    --parameter-overrides EnvId="$ENV_ID" \
    --no-fail-on-empty-changeset

BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name $ENV_ID-web-resources \
    --query "Stacks[0].Outputs[?OutputKey=='ResourcesBucketName'].OutputValue" \
    --output text)    

log "S3 sync to $BUCKET_NAME..."
aws s3 sync $DIR/presence_web/target/ s3://$BUCKET_NAME/ --delete
log "S3 sync complete"

# Tenant ID for cross-stack references to shared account-level resources (VPC, DB)
TENANT_ID=${TENANT_ID:-"presence-env"}
log "Using TENANT_ID=$TENANT_ID for cross-stack DB references"

# Deploy SAM API function
log "Deploying SAM API function..."
SAM_BUILD_TEMPLATE="$DIR/presence_sam/.aws-sam/build/template.yaml"
if [ ! -f "$SAM_BUILD_TEMPLATE" ]; then
    echo "❌ SAM build output not found: $SAM_BUILD_TEMPLATE"
    echo "   Run $SCRIPT_DIR/env-build.sh first to generate build artifacts."
    exit 1
fi

# Capture version information
APP_VERSION=$(date -u +"%Y%m%d-%H%M%S")
GIT_COMMIT=$(git -C "$DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")

log "📦 Deploying version: $APP_VERSION (commit: $GIT_COMMIT)"

pushd $DIR/presence_sam
sam deploy \
    --stack-name $ENV_ID-presence-api \
    --parameter-overrides \
        EnvId=$ENV_ID \
        TenantId=$TENANT_ID \
        AppVersion=$APP_VERSION \
        GitCommit=$GIT_COMMIT \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    --no-confirm-changeset 
popd
log "✓ SAM API function deployed"

log "Deploying web-distribution stack..."
aws cloudformation deploy \
    --stack-name $ENV_ID-web-distribution \
    --template-file $DIR/presence_cform/web-distribution.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
        CertificateArn="$CERTIFICATE_ARN" \
    --no-fail-on-empty-changeset

log "Deploying web-records stack..."
aws cloudformation deploy \
    --stack-name $ENV_ID-web-records \
    --template-file $DIR/presence_cform/web-records.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
        HostedZoneId="$ZONE_ID" \
    --no-fail-on-empty-changeset

# Get distribution ID and URL
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name $ENV_ID-web-distribution \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
    --output text)

DISTRIBUTION_URL=$(aws cloudformation describe-stacks \
    --stack-name $ENV_ID-web-distribution \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
    --output text)

# Invalidate CloudFront cache to ensure new content is served
log "🚀 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" 

if [ "${GITOPS_WAIT_DISTRIBUTION_READY}" = "true" ]; then
    # Wait for CloudFront distribution to be deployed
    echo "⏳ Waiting for CloudFront distribution to be deployed..."
    aws cloudformation wait stack-update-complete --stack-name $ENV_ID-web-distribution 2>/dev/null || true

    MAX_WAIT=600  # 10 minutes
    WAIT_INTERVAL=30
    elapsed=0

    while [ $elapsed -lt $MAX_WAIT ]; do
        DIST_STATUS=$(aws cloudfront get-distribution \
            --id "$DISTRIBUTION_ID" \
            --query "Distribution.Status" \
            --output text 2>/dev/null || echo "Unknown")
        
        if [ "$DIST_STATUS" = "Deployed" ]; then
            echo "✓ Distribution is deployed"
            break
        fi
        
        echo "  Distribution status: $DIST_STATUS (waiting ${elapsed}s/${MAX_WAIT}s)"
        sleep $WAIT_INTERVAL
        elapsed=$((elapsed + WAIT_INTERVAL))
    done

    if [ "$DIST_STATUS" != "Deployed" ]; then
        echo "⚠️  Warning: Distribution not fully deployed after ${MAX_WAIT}s"
    fi
else
    echo "⏩ Skipping CloudFront distribution wait (GITOPS_WAIT_DISTRIBUTION_READY not set to true)"
fi

# Health check
log "🏥 Running health check on https://$DOMAIN_NAME/fn/__hc"
HEALTH_CHECK_URL="https://$DOMAIN_NAME/fn/__hc"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" --connect-timeout 10 --max-time 30 || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed (HTTP $HTTP_CODE)"
    HEALTH_STATUS="✅ HEALTHY"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "⚠️  Health check failed: Connection error"
    HEALTH_STATUS="⚠️  UNHEALTHY (Connection error)"
else
    echo "⚠️  Health check failed (HTTP $HTTP_CODE)"
    HEALTH_STATUS="⚠️  UNHEALTHY (HTTP $HTTP_CODE)"
fi

echo ""
log "✅ Deployment to $ENV_ID completed!"
log "🌐 Distribution URL: https://$DISTRIBUTION_URL"
log "🌐 Custom Domain: https://$DOMAIN_NAME"
log "🏥 Health Status: $HEALTH_STATUS"