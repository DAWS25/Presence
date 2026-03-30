#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]:-$0}" )" && pwd )"
pushd "$DIR/.."
echo "[$(date +'%Y-%m-%d %H:%M:%S')] script [$0] started dir[$DIR]"
##

TEMPLATE_FILE="$DIR/oidc-params.cform.yaml"
TENANT_ID="${TENANT_ID:-Perm}"
ENV_ID="${ENV_ID:-Incubator}"

# Google OIDC parameters to create
declare -A PARAMS=(
    ["GOOGLE_CLIENT_ID"]="${GOOGLE_CLIENT_ID:?GOOGLE_CLIENT_ID is required}"
)

for PARAM_NAME in "${!PARAMS[@]}"; do
    PARAM_VALUE="${PARAMS[$PARAM_NAME]}"
    STACK_NAME="${TENANT_ID}-${ENV_ID}-${PARAM_NAME//_/-}"

    echo "Deploying parameter: $PARAM_NAME"
    aws cloudformation deploy \
        --stack-name "$STACK_NAME" \
        --template-file "$TEMPLATE_FILE" \
        --parameter-overrides \
            TenantId="$TENANT_ID" \
            EnvId="$ENV_ID" \
            ParamName="${PARAM_NAME//_/-}" \
            ParamValue="$PARAM_VALUE" \
        --no-fail-on-empty-changeset

    echo "Deployed parameter: $PARAM_NAME"
done

##
popd
echo "[$(date +'%Y-%m-%d %H:%M:%S')] script [$0] completed"