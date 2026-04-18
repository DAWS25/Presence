#!/bin/bash
set -euo pipefail

LOG_FILE="/tmp/post-create.log"

log() {
    local msg="[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*"
    echo "$msg" | tee -a "$LOG_FILE"
}

log "========== post-create.sh started =========="
log "User: $(whoami)"
log "Home: $HOME"
log "PWD: $(pwd)"
log "PATH: $PATH"
log "Shell: $SHELL"
log "OS: $(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 || echo 'unknown')"
log "CODESPACE_NAME: ${CODESPACE_NAME:-unset}"

# Package manager detection (apt or yum only)
if command -v apt-get &> /dev/null; then
    log "Using apt-get as package manager."
    PKG_MANAGER="apt-get"
    PKG_UPDATE_CMD="sudo apt-get update"
    PKG_INSTALL_CMD="sudo apt-get install -y"
elif command -v yum &> /dev/null; then
    log "Using yum as package manager."
    PKG_MANAGER="yum"
    PKG_UPDATE_CMD="sudo yum makecache"
    PKG_INSTALL_CMD="sudo yum install -y"
else
    log "ERROR: No supported package manager found (apt-get or yum)."
    exit 1
fi

# Update package lists
log "Updating package lists..."
${PKG_UPDATE_CMD}
log "Package lists updated."

# Devbox setup
log "--- Devbox setup ---"
if ! command -v devbox &> /dev/null
then
    log "devbox not found, installing..."
    export PATH="$HOME/.devbox/bin:$PATH"
    mkdir -p /nix/var/nix/db
    sudo chown -R $(whoami) /nix
    log "Running devbox installer..."
    curl -fsSL https://get.jetify.com/devbox | bash -s -- --force
    log "devbox installer finished (exit: $?). Running devbox install..."
    yes | devbox install
    log "devbox install finished (exit: $?)."
else
    log "devbox already installed: $(which devbox)"
fi
log "Setting /nix ownership..."
sudo chown -R $USER /nix
log "devbox version: $(devbox version 2>&1 || echo 'NOT AVAILABLE')"

# Docker setup
log "--- Docker setup ---"
if ! command -v docker &> /dev/null; then
    log "docker not found, installing..."
    if [ "${PKG_MANAGER}" = "apt-get" ]; then
        ${PKG_INSTALL_CMD} ca-certificates curl gnupg lsb-release
        sudo install -m 0755 -d /etc/apt/keyrings
        . /etc/os-release
        DOCKER_DISTRO="debian"
        if [ "$ID" = "ubuntu" ]; then DOCKER_DISTRO="ubuntu"; fi
        curl -fsSL "https://download.docker.com/linux/${DOCKER_DISTRO}/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DOCKER_DISTRO} ${VERSION_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        ${PKG_UPDATE_CMD}
        ${PKG_INSTALL_CMD} docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    elif [ "${PKG_MANAGER}" = "yum" ]; then
        ${PKG_INSTALL_CMD} yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        ${PKG_INSTALL_CMD} docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
    sudo systemctl enable --now docker
fi

# Post-install: docker group and user access
log "Configuring docker group..."
if ! getent group docker > /dev/null; then
    sudo groupadd docker
fi
sudo usermod -aG docker ${USER}
log "Docker setup complete."

# DirEnv setup
log "--- DirEnv setup ---"
touch .envrc
direnv allow .
log "DirEnv configured."

# Python and NodeJS setup
log "--- Python and NodeJS setup ---"
if [ "$PKG_MANAGER" = "apt-get" ]; then
    log "Installing Python and Node via apt-get..."
    ${PKG_INSTALL_CMD} python3-full python3-pip nodejs npm
elif [ "$PKG_MANAGER" = "yum" ]; then
    log "Installing Python and Node via yum..."
    ${PKG_INSTALL_CMD} python3 python3-pip nodejs npm
fi

# Livereload setup
log "--- Livereload setup ---"
if ! command -v livereload &> /dev/null
then
    log "livereload not found, installing..."
    pip3 install livereload --break-system-packages
fi

# Port redirect: ensure 443 -> 10443 when missing
# curl -k https://local.env.daws25.com
log "--- Port redirect setup ---"
if ! command -v iptables &> /dev/null
then
    log "iptables not found, installing..."
    ${PKG_INSTALL_CMD} iptables
fi
if command -v iptables &> /dev/null
then
    if ! sudo iptables -w -t nat -C PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 10443 &> /dev/null; then
        log "Adding iptables redirect: 443 -> 10443 (PREROUTING)"
        sudo iptables -w -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 10443
    fi
    if ! sudo iptables -w -t nat -C OUTPUT -d 127.0.0.1/32 -p tcp --dport 443 -j REDIRECT --to-ports 10443 &> /dev/null; then
        log "Adding iptables redirect: 443 -> 10443 (OUTPUT localhost)"
        sudo iptables -w -t nat -A OUTPUT -d 127.0.0.1/32 -p tcp --dport 443 -j REDIRECT --to-ports 10443
    fi
else
    log "WARNING: iptables is unavailable; 443 -> 10443 redirect not configured."
fi

# Port visibility
log "--- Port visibility ---"
if [ -n "${CODESPACE_NAME:-}" ]; then
    log "Setting port visibility for codespace: $CODESPACE_NAME"
    gh codespace ports visibility 10080:public 10443:public -c "$CODESPACE_NAME"
    log "Port visibility set."
else
    log "CODESPACE_NAME not set, skipping port visibility."
fi

log "========== post-create.sh completed successfully =========="
log "Log file saved at: $LOG_FILE"
