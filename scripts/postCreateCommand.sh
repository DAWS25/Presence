#!/bin/env bash
echo "Starting DevContainer"

# Instalar Python 3 completo com biblioteca padrão

sudo apt update
sudo apt install -y python3-full python3-pip

# Instalar Node.js e npm
sudo apt install -y nodejs npm

# Instalar livereload para desenvolvimento web
pip3 install livereload --break-system-packages
