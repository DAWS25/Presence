#!/usr/bin/env bash
set -x
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
pushd "$DIR"
# 

sleep 5
while true; do
    echo "## healthcheck: $(date)"
    curl -vsk https://local.env.daws25.com:10443/fn/__hc
    echo "##"
    sleep 30
done

#
popd