#!/bin/bash

# Package manager detection (apt or yum only)
if command -v apt-get &> /dev/null; then
    echo "Using apt-get as package manager."
    PKG_MANAGER="apt-get"
    PKG_UPDATE_CMD="sudo apt-get update"
    PKG_INSTALL_CMD="sudo apt-get install -y"
elif command -v yum &> /dev/null; then
    echo "Using yum as package manager."
    PKG_MANAGER="yum"
    PKG_UPDATE_CMD="sudo yum makecache"
    PKG_INSTALL_CMD="sudo yum install -y"
else
    echo "No supported package manager found (apt-get or yum)."
    exit 1
fi

# Update package lists
${PKG_UPDATE_CMD}

# Devbox setup
if ! command -v devbox &> /dev/null
then
    echo "devbox could not be found, installing"
    export PATH="$HOME/.devbox/bin:$PATH"
    mkdir -p /nix/var/nix/db
    sudo chown -R $(whoami) /nix
    curl -fsSL https://get.jetify.com/devbox | bash -s -- --force
    yes | devbox install 
fi 
# Nix fix
mkdir -p /nix
sudo chown -R $USER /nix

# DirEnv setup
if ! command -v direnv &> /dev/null
then
    echo "direnv could not be found, installing..."
    ${PKG_INSTALL_CMD} direnv
fi
touch .envrc
direnv allow .
# 

# Python setup
# if apt
if [ "$PKG_MANAGER" = "apt-get" ]; then
    echo "Installing Python 3 and pip using apt-get."    
    ${PKG_INSTALL_CMD} python3-full python3-pip nodejs npm
    # Install livereload for web development
    pip3 install livereload --break-system-packages
elif [ "$PKG_MANAGER" = "yum" ]; then
    echo "Installing Python 3 and pip using yum."
    ${PKG_INSTALL_CMD} python3 python3-pip nodejs npm
    # Install livereload for web development
    pip3 install livereload --break-system-packages
fi

# System Info
echo "PWD: $(pwd)"

echo post-create.sh executed successfully.
