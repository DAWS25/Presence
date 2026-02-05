#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
echo "script [$0] started"
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
source "$SCRIPT_DIR/env-build.sh"

CURRENT_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ "$CURRENT_ACCOUNT_ID" != "$TARGET_ACCOUNT_ID" ]; then
    echo "❌ AWS account ID mismatch! Expected $TARGET_ACCOUNT_ID but got $CURRENT_ACCOUNT_ID"
    exit 1
fi

aws cloudformation deploy \
    --stack-name $ENV_ID-web-zone \
    --template-file $DIR/presence_cform/web-zone.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
    --no-fail-on-empty-changeset

HOSTED_ZONE_ID=$(aws cloudformation describe-stacks \
    --stack-name $ENV_ID-web-zone \
    --query "Stacks[0].Outputs[?OutputKey=='HostedZoneId'].OutputValue" \
    --output text)

aws cloudformation deploy \
    --stack-name $ENV_ID-web-certificate \
    --template-file $DIR/presence_cform/web-certificate.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
        HostedZoneId="$HOSTED_ZONE_ID" \
    --no-fail-on-empty-changeset

aws cloudformation deploy \
    --stack-name $ENV_ID-web-resources \
    --template-file $DIR/presence_cform/web-resources.cform.yaml \
    --parameter-overrides EnvId="$ENV_ID" \
    --no-fail-on-empty-changeset

BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name $ENV_ID-web-resources \
    --query "Stacks[0].Outputs[?OutputKey=='ResourcesBucketName'].OutputValue" \
    --output text)    

aws s3 sync $DIR/presence_web/target/ s3://$BUCKET_NAME/ --delete

aws cloudformation deploy \
    --stack-name $ENV_ID-web-distribution \
    --template-file $DIR/presence_cform/web-distribution.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
    --no-fail-on-empty-changeset

aws cloudformation deploy \
    --stack-name $ENV_ID-web-records \
    --template-file $DIR/presence_cform/web-records.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
        HostedZoneId="$HOSTED_ZONE_ID" \
    --no-fail-on-empty-changeset

DISTRIBUTION_URL=$(aws cloudformation describe-stacks \
    --stack-name $ENV_ID-web-distribution \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
    --output text)

echo "✅ Deployment to $ENV_ID completed!"
echo "🌐 Distribution URL: https://$DISTRIBUTION_URL"
echo "🌐 Custom Domain: https://$DOMAIN_NAME"