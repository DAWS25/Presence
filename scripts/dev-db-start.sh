#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
pushd "$DIR"

# Cleanup any existing postgres container and data directory
docker rm -f postgres 2>/dev/null || true
sudo rm -rf "${DIR}/.data/postgres"
sudo mkdir -p "${DIR}/.data/postgres"
sudo chown -R $(id -u):$(id -g) "${DIR}/.data"

docker compose up database

popd