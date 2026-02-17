#!/usr/bin/env bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd "$SCRIPT_DIR/.."
DIR="$(dirname "$SCRIPT_DIR")"
echo "script [$0] started"
#

ENV_GRADE=${ENV_GRADE:-"local"}
ENV_ID=${ENV_ID:-"project-$ENV_GRADE"}
AWS_CLI="aws"
if [ "$ENV_GRADE" = "local" ]; then
    AWS_CLI="awslocal"
fi
DOMAIN_PARENT=${DOMAIN_PARENT:-"daws25.com"}
DOMAIN_NAME="$ENV_ID.$DOMAIN_PARENT"

# Build
source "$SCRIPT_DIR/dev-build.sh"

$AWS_CLI cloudformation deploy \
    --stack-name $ENV_ID-web-zone \
    --template-file $DIR/presence_cform/web-zone.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
    --no-fail-on-empty-changeset

HOSTED_ZONE_ID=$($AWS_CLI cloudformation describe-stacks \
    --stack-name $ENV_ID-web-zone \
    --query "Stacks[0].Outputs[?OutputKey=='HostedZoneId'].OutputValue" \
    --output text)


$AWS_CLI cloudformation deploy \
    --stack-name $ENV_ID-web-certificate \
    --template-file $DIR/presence_cform/web-certificate.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
        HostedZoneId="$HOSTED_ZONE_ID" \
    --no-fail-on-empty-changeset

$AWS_CLI cloudformation deploy \
    --stack-name $ENV_ID-web-resources \
    --template-file $DIR/presence_cform/web-resources.cform.yaml \
    --parameter-overrides EnvId="$ENV_ID" \
    --no-fail-on-empty-changeset

BUCKET_NAME=$($AWS_CLI cloudformation describe-stacks \
    --stack-name $ENV_ID-web-resources \
    --query "Stacks[0].Outputs[?OutputKey=='ResourcesBucketName'].OutputValue" \
    --output text)    

$AWS_CLI s3 sync $DIR/presence_web/target/ s3://$BUCKET_NAME/ --delete

# Deploy Lambda@Edge auth function
echo "🔧 Deploying Lambda@Edge auth function..."
pushd $DIR/presence_edge_auth
$AWS_CLI cloudformation deploy \
    --stack-name $ENV_ID-edge-auth \
    --template-file $DIR/presence_edge_auth/.aws-sam/build/template.yaml \
    --parameter-overrides EnvId="$ENV_ID" \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset
popd

# Deploy Lambda@Edge CORS function
echo "🔧 Deploying Lambda@Edge CORS function..."
pushd $DIR/presence_edge_cors
$AWS_CLI cloudformation deploy \
    --stack-name $ENV_ID-edge-cors \
    --template-file $DIR/presence_edge_cors/.aws-sam/build/template.yaml \
    --parameter-overrides EnvId="$ENV_ID" \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset
popd

$AWS_CLI cloudformation deploy \
    --stack-name $ENV_ID-web-distribution \
    --template-file $DIR/presence_cform/web-distribution.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
    --no-fail-on-empty-changeset

$AWS_CLI cloudformation deploy \
    --stack-name $ENV_ID-web-records \
    --template-file $DIR/presence_cform/web-records.cform.yaml \
    --parameter-overrides \
        EnvId="$ENV_ID" \
        DomainName="$DOMAIN_NAME" \
        HostedZoneId="$HOSTED_ZONE_ID" \
    --no-fail-on-empty-changeset

DISTRIBUTION_URL=$($AWS_CLI cloudformation describe-stacks \
    --stack-name $ENV_ID-web-distribution \
    --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
    --output text)

echo ""
echo "✅ Deployment to $ENV_ID completed!"
echo ""
echo "📦 S3 Bucket: $BUCKET_NAME"
if [ "$ENV_GRADE" = "local" ]; then
    echo "🌐 Local S3 URL: http://localhost:4566/$BUCKET_NAME/index.html"
fi
echo "🌐 Distribution URL: https://$DISTRIBUTION_URL"
echo "🌐 Custom Domain: https://$DOMAIN_NAME"

echo "✅ Deployment to $ENV_ID completed!"

#
popd

