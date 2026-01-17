#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
# 
ENV_ID=${ENV_ID:-"project-alpha"}

# Load Configuration
ENV_FILE="$DIR/env/$ENV_ID/.envrc"
if [ -f "$ENV_FILE" ]; then
    echo "🔧 Loading $ENV_FILE..."
    source "$ENV_FILE"
else
    echo "❌ $ENV_FILE not found!"
    exit 1
fi

# Build
source "$SCRIPT_DIR/env-build.sh"

CURRENT_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ "$CURRENT_ACCOUNT_ID" != "$TARGET_ACCOUNT_ID" ]; then
    echo "❌ AWS account ID mismatch! Expected $TARGET_ACCOUNT_ID but got $CURRENT_ACCOUNT_ID"
    exit 1
fi

aws cloudformation deploy \
    --stack-name $ENV_ID-resources \
    --template-file $DIR/infra/resources.cform.yaml \
    --parameter-overrides EnvId="$ENV_ID"

BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name $ENV_ID-resources \
    --query "Stacks[0].Outputs[?OutputKey=='ResourcesBucketName'].OutputValue" \
    --output text)    

aws s3 sync $DIR/presence_web/target/ s3://$BUCKET_NAME/ --delete

aws cloudformation deploy \
    --stack-name $ENV_ID-distribution \
    --template-file $DIR/infra/distribution.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
        HostedZoneId="$ZONE_ID" \
        CertificateArn="$CERTIFICATE_ARN"

echo "✅ Deployment to $ENV_ID completed!"