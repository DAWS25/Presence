#!/bin/env bash
set -ex
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DIR="$(dirname "$SCRIPT_DIR")"
WEB_DIR="$DIR/presence_web"

echo "🚀 Iniciando servidor de desenvolvimento Presence..."

# Verificar se node_modules está instalado
if [ ! -d "$WEB_DIR/node_modules" ]; then
    echo "📦 Instalando dependências npm..."
    cd "$WEB_DIR"
    npm install
fi

# Limpar e preparar pasta target
echo "📂 Preparando pasta target..."
rm -rf $WEB_DIR/target/*
mkdir -p $WEB_DIR/target

# Copiar arquivos src para target
cp -a $WEB_DIR/src/* $WEB_DIR/target/

# Copiar node_modules para target (necessário para Bootstrap e face-api.js)
cp -a $WEB_DIR/node_modules $WEB_DIR/target/

# Iniciar livereload server com suporte a mudanças de arquivo
python3 - <<EOF
import os
import shutil
import sys
from livereload import Server

server = Server()

def rebuild():
    """Reconstrói os arquivos quando há mudanças"""
    src = '$WEB_DIR/src'
    target = '$WEB_DIR/target'
    
    # Limpar e copiar src
    if os.path.exists(target):
        shutil.rmtree(target, ignore_errors=True)
    os.makedirs(target, exist_ok=True)
    shutil.copytree(src, target, dirs_exist_ok=True)
    
    # Copiar node_modules
    node_modules_src = '$WEB_DIR/node_modules'
    node_modules_target = os.path.join(target, 'node_modules')
    if os.path.exists(node_modules_src):
        if os.path.exists(node_modules_target):
            shutil.rmtree(node_modules_target)
        shutil.copytree(node_modules_src, node_modules_target)
    
    print('✅ Arquivos atualizados!')

# Monitorar mudanças em arquivos
server.watch('$WEB_DIR/src/**/*', rebuild)

# Iniciar servidor
print('🌐 Servidor rodando em http://localhost:8080/')
print('👀 Monitorando mudanças em $WEB_DIR/src...')
server.serve(root='$WEB_DIR/target', port=8080, host='0.0.0.0')
EOF
