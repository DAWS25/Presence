#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
echo "script [$0] started"
# 

# Validate required environment variables
if [ -z "$ENV_ID" ]; then
    echo "❌ ENV_ID is required"
    exit 1
fi

MAX_ATTEMPTS=10
WAIT_TIME=120  # 2 minutes in seconds
attempt=1

# Empty S3 bucket before attempting stack deletion
echo "🪣 Checking for S3 bucket to empty..."
if aws cloudformation describe-stacks --stack-name $ENV_ID-web-resources >/dev/null 2>&1; then
    BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name $ENV_ID-web-resources \
        --query "Stacks[0].Outputs[?OutputKey=='ResourcesBucketName'].OutputValue" \
        --output text 2>/dev/null || echo "")
    
    if [ ! -z "$BUCKET_NAME" ]; then
        echo "🪣 Emptying bucket: $BUCKET_NAME"
        aws s3 rm s3://$BUCKET_NAME/ --recursive 2>/dev/null || echo "  ⚠️  Bucket may already be empty or deleted"
        echo "  ✓ Bucket emptied"
    else
        echo "  No bucket found in stack outputs"
    fi
else
    echo "  Stack $ENV_ID-web-resources not found, skipping bucket deletion"
fi

echo "🗑️  Starting deletion of CloudFormation stacks for environment: $ENV_ID"

while [ $attempt -le $MAX_ATTEMPTS ]; do
    echo ""
    echo "📍 Attempt $attempt of $MAX_ATTEMPTS"
    
    # Get list of stacks that start with ENV_ID
    STACKS=$(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE ROLLBACK_COMPLETE \
        --query "StackSummaries[?starts_with(StackName, '${ENV_ID}-')].StackName" \
        --output text)
    
    if [ -z "$STACKS" ]; then
        echo "✅ All stacks deleted successfully!"
        break
    fi
    
    echo "📋 Found stacks to delete: $(echo $STACKS | tr '\t' ', ')"
    
    # Try to delete each stack
    failed_stacks=""
    for stack in $STACKS; do
        echo "  Deleting stack: $stack"
        if aws cloudformation delete-stack --stack-name "$stack" 2>/dev/null; then
            echo "  ✓ Delete initiated for $stack"
        else
            echo "  ⚠️  Failed to delete $stack"
            failed_stacks="$failed_stacks $stack"
        fi
    done
    
    # Wait for deletions to complete
    echo "⏳ Waiting for stacks to be deleted..."
    for stack in $STACKS; do
        if ! echo "$failed_stacks" | grep -q "$stack"; then
            aws cloudformation wait stack-delete-complete --stack-name "$stack" 2>/dev/null || true
        fi
    done
    
    # Check if there are still stacks remaining
    REMAINING=$(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE ROLLBACK_COMPLETE \
        --query "StackSummaries[?starts_with(StackName, '${ENV_ID}-')].StackName" \
        --output text)
    
    if [ -z "$REMAINING" ]; then
        echo "✅ All stacks deleted successfully!"
        break
    fi
    
    if [ $attempt -lt $MAX_ATTEMPTS ]; then
        echo "⏰ Stacks still remaining. Waiting $WAIT_TIME seconds before retry..."
        sleep $WAIT_TIME
    fi
    
    ((attempt++))
done

if [ $attempt -gt $MAX_ATTEMPTS ]; then
    echo "❌ Max attempts ($MAX_ATTEMPTS) exceeded. Some stacks may still exist:"
    aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE UPDATE_ROLLBACK_COMPLETE ROLLBACK_COMPLETE \
        --query "StackSummaries[?starts_with(StackName, '${ENV_ID}-')].StackName" \
        --output text
    exit 1
fi

echo ""
echo "✅ Environment $ENV_ID destroyed successfully!"
echo "script [$0] completed"
