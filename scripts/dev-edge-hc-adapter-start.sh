#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIR="$(dirname "$SCRIPT_DIR")"
echo "script [$0] started"
#

echo "📦 Installing adapter dependencies..."
VENV_DIR="$DIR/.venv"
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
fi
"$VENV_DIR/bin/pip" install -q boto3

echo "⏳ Waiting for Lambda@Edge HC to be ready on port 10042..."
for i in $(seq 1 30); do
    if curl -s http://localhost:10042 >/dev/null 2>&1; then
        echo "✓ Lambda@Edge HC is ready"
        break
    fi
    sleep 1
done

echo "🔌 Starting Edge HC adapter on port 10043..."
cd "$DIR/presence_edge_hc"
"$VENV_DIR/bin/python3" adapter.py
