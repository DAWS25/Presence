#!/bin/env bash
echo "Starting DevContainer"

# Install system tools
sudo apt update
sudo apt install -y python3-full python3-pip nodejs npm

# Install livereload for web development
pip3 install livereload --break-system-packages

# Links exising tools
ln -s /usr/games/cowsay /usr/local/bin/cowsay

echo "Done postCreateCommand.sh"