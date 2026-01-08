#!/usr/bin/env bash
set -ex

aws cloudformation deploy --stack-name resources-bucket-resources --template-file solutions/petoboto-resources/bucket.cform.yaml