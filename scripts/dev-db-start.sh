#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
pushd "$DIR"

# Cleanup any existing postgres container (keep data)
docker rm -f postgres 2>/dev/null || true
mkdir -p "${DIR}/.data/postgres"

docker compose up database

popd