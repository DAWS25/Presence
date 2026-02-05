#!/usr/bin/env bash
set -e
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd "$DIR/.."
echo "script [$0] started"
#

awslocal cloudformation deploy \
    --stack-name local-web-resources-stack \
    --template-file "./presence_cform/web-resources.cform.yaml"

#
popd

