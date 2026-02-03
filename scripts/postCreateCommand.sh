#!/bin/env bash
echo "Starting DevContainer"

# Install system tools
sudo apt update
sudo apt install -y python3-full python3-pip nodejs npm

# Install livereload for web development
pip3 install livereload --break-system-packages

# TODO: Setup devbox
# curl -fsSL https://get.devbox.sh | bash

# Nix fix
sudo chown -R $USER /nix

# DirEnv installation check
if ! command -v direnv &> /dev/null
then
    echo "direnv could not be found, installing..."
    sudo apt-get update
    sudo apt-get install -y direnv
else
    direnv allow .
fi

# Info
echo "PWD: $(pwd)"

echo "Done postCreateCommand.sh"