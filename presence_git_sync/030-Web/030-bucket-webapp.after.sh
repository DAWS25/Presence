#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]:-$0}" )" && pwd )"
REPO_ROOT="$(cd "${DIR}/../../../.." && pwd )"

echo "Starting Presence web app hook..."

# Verify that the module is initialized
TENANT_ID="Presence"
ENV_ID="Main"
VPC_TENANT_ID="IncPerm"
MODULE_DIR="${REPO_ROOT}/modules/Presence"

# Iniialize git submodule or pull the module to main branch
if [ ! -d "${MODULE_DIR}/.git" ]; then
    echo "Initializing Presence module submodule..."
    git submodule update --init --recursive "${MODULE_DIR}"
else
    echo "Updating Presence module submodule..."
    pushd "${MODULE_DIR}"
    git fetch origin main
    git checkout main
    git pull origin main
    popd
fi

# Build the Presence module
pushd "${MODULE_DIR}"
echo "Building Presence module..."
make
popd

# Upload the webapp assets to S3
pushd "${MODULE_DIR}/presence_web/target"
echo "Uploading Presence web app..."
BUCKET_STACK_NAME="${TENANT_ID}-bucket-webapp"
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name "${BUCKET_STACK_NAME}" --query "Stacks[0].Outputs[?OutputKey=='WebAppBucketName'].OutputValue" --output text)
aws s3 sync . "s3://${BUCKET_NAME}" --delete
popd

# Deploy SAM 
pushd "${MODULE_DIR}/presence_sam/"
echo "Deploying Presence SAM webapp..."
SAM_STACK_NAME="${TENANT_ID}-${ENV_ID}-Web-sam-fn"
APP_VERSION=$(date -u +"%Y%m%d-%H%M%S")
GIT_COMMIT=$(git -C "$DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
sam deploy \
    --stack-name "${SAM_STACK_NAME}" \
    --capabilities CAPABILITY_NAMED_IAM \
    --resolve-s3 \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
        TenantId=${TENANT_ID} \
        EnvId=${ENV_ID} \
        VPCTenantId=${VPC_TENANT_ID} \
        AppVersion=${APP_VERSION} \
        GitCommit=${GIT_COMMIT}
aws cloudformation wait stack-update-complete --stack-name "${SAM_STACK_NAME}"
popd
echo "✓ Presence SAM webapp deployed"

pushd $MODULE_DIR/presence_edge_auth
SAM_STACK_NAME="${TENANT_ID}-${ENV_ID}-Web-edge-auth"
echo "Deploying Presence Lambda@Edge auth function..."
sam deploy \
    --stack-name "${SAM_STACK_NAME}" \
    --resolve-s3 \
    --parameter-overrides TenantId=${TENANT_ID} EnvId=${ENV_ID} \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    --no-confirm-changeset
aws cloudformation wait stack-update-complete --stack-name "${SAM_STACK_NAME}"
echo "✓ Lambda@Edge auth function deployed"
popd

pushd $MODULE_DIR/presence_edge_cors
SAM_STACK_NAME="${TENANT_ID}-${ENV_ID}-Edge-CORS"
echo "Deploying Presence Lambda@Edge CORS function..."
sam deploy \
    --stack-name "${SAM_STACK_NAME}" \
    --resolve-s3 \
    --parameter-overrides TenantId=${TENANT_ID} EnvId=${ENV_ID} \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    --no-confirm-changeset
aws cloudformation wait stack-update-complete --stack-name "${SAM_STACK_NAME}"
popd
echo "✓ Lambda@Edge CORS function deployed"

pushd $MODULE_DIR/presence_edge_hc
echo "Deploying Presence Lambda@Edge healthcheck function..."
SAM_STACK_NAME="${TENANT_ID}-${ENV_ID}-Edge-Health"
sam deploy \
    --stack-name "${SAM_STACK_NAME}" \
    --resolve-s3 \
    --parameter-overrides TenantId=${TENANT_ID} EnvId=${ENV_ID} \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    --no-confirm-changeset
aws cloudformation wait stack-update-complete --stack-name "${SAM_STACK_NAME}"
popd
echo "✓ Lambda@Edge healthcheck function deployed"

pushd $MODULE_DIR/presence_edge_root
SAM_STACK_NAME="${TENANT_ID}-${ENV_ID}-Edge-Root"
echo "Deploying Presence Lambda@Edge root redirect function..."
sam deploy \
    --stack-name "${SAM_STACK_NAME}" \
    --resolve-s3 \
    --parameter-overrides TenantId=${TENANT_ID} EnvId=${ENV_ID} \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset \
    --no-confirm-changeset
aws cloudformation wait stack-update-complete --stack-name "${SAM_STACK_NAME}"
popd
echo "✓ Lambda@Edge root redirect function deployed"

# Invalidate CloudFront SHA256 so it redeploys with updated Lambda@Edge version ARNs from SSM
rm -f "${REPO_ROOT}/git-sync/100-IncPerm/300-Presence/040-Distribution/040-cloudfront-distribution.stack.sha256.txt"

echo "✓ Presence web app hook completed ✓"