#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]:-$0}" )" && pwd )"

TENANT_ID="Presence"
ENV_ID="Main"
STACK_NAME="${TENANT_ID}-${ENV_ID}-cloudfront-distribution"

echo "Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
    --output text)

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
    echo "⚠️ Could not find distribution ID from stack ${STACK_NAME}"
    exit 1
fi

aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text

echo "✓ CloudFront cache invalidation created for ${DISTRIBUTION_ID}"
