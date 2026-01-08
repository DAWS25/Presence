#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
#
 
export ENV_ID="presence-beta"
source "$SCRIPT_DIR/env-deploy.sh"

