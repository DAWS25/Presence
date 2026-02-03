#!/usr/bin/env bash
set -ex
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DIR="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$DIR/presence_web"

echo "🚀 Starting Presence development server..."

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
    
    print('✅ Files updated!')

# Monitor file changes
server.watch('$WEB_DIR/src/**/*', rebuild)

# Start server
print('🌐 Server running at http://localhost:8080/')
print('👀 Monitoring changes in $WEB_DIR/src...')
server.serve(root='$WEB_DIR/target', port=8080, host='0.0.0.0')
EOF
