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

echo "⏳ Waiting for Lambda@Edge to be ready on port 3343..."
for i in $(seq 1 30); do
    if curl -s http://localhost:3343 >/dev/null 2>&1; then
        echo "✓ Lambda@Edge is ready"
        break
    fi
    sleep 1
done

echo "🔌 Starting Edge adapter on port 3344..."
cd "$DIR/presence_edge"
"$VENV_DIR/bin/python3" adapter.py
