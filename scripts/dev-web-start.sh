#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DIR="$(dirname "$SCRIPT_DIR")"

WEB_DIR="$DIR/presence_web"

echo "🚀 Starting Presence development server..."

restart_proxy() {
    if command -v docker >/dev/null 2>&1; then
        if docker ps --format '{{.Names}}' | grep -qx 'proxy'; then
            echo "🔁 Restarting proxy container to refresh mounts..."
            docker restart proxy
        fi
    fi
}

# Check if node_modules is installed
if [ ! -d "$WEB_DIR/node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    cd "$WEB_DIR"
    npm install
fi

# Clean and prepare target folder
echo "📂 Preparing target folder..."
rm -rf $WEB_DIR/target/*
mkdir -p $WEB_DIR/target

# Copy src files to target
cp -a $WEB_DIR/src/* $WEB_DIR/target/

# Copy node_modules to target (required for Bootstrap and face-api.js)
cp -a $WEB_DIR/node_modules $WEB_DIR/target/

# Replace environment variables in HTML files
echo "🔧 Substituting environment variables..."
ENVSUBST_VARS=(GOOGLE_CLIENT_ID)
for var in "${ENVSUBST_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: Required variable $var is not set" >&2
        exit 1
    fi
done
envsubst '$GOOGLE_CLIENT_ID' < $WEB_DIR/src/app/app.html > $WEB_DIR/target/app/app.html

restart_proxy

# Iniciar livereload server com suporte a mudanças de arquivo
python3 - <<EOF
import os
import shutil
import sys
from livereload import Server

server = Server()

def rebuild():
    """Rebuilds files when there are changes"""
    src = '$WEB_DIR/src'
    target = '$WEB_DIR/target'
    
    # Clean and copy src
    if os.path.exists(target):
        shutil.rmtree(target, ignore_errors=True)
    os.makedirs(target, exist_ok=True)
    shutil.copytree(src, target, dirs_exist_ok=True)
    
    # Copy node_modules
    node_modules_src = '$WEB_DIR/node_modules'
    node_modules_target = os.path.join(target, 'node_modules')
    if os.path.exists(node_modules_src):
        if os.path.exists(node_modules_target):
            shutil.rmtree(node_modules_target)
        shutil.copytree(node_modules_src, node_modules_target)

    # Substitute environment variables in app.html
    os.system("envsubst '\$GOOGLE_CLIENT_ID' < '$WEB_DIR/src/app/app.html' > '$WEB_DIR/target/app/app.html'")

    os.system("docker restart proxy >/dev/null 2>&1 || true")
    
    print('✅ Files updated!')

# Monitor file changes
server.watch('$WEB_DIR/src/**/*', rebuild)

# Start server
print('🌐 Server running at http://localhost:10932/')
print('👀 Monitoring changes in $WEB_DIR/src...')
server.serve(root='$WEB_DIR/target', port=10932, host='0.0.0.0')
EOF
