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

# Docker CLI setup (Codespaces provides the Docker daemon via host socket)
if ! command -v docker &> /dev/null; then
    echo "Docker not found, installing..."
    . /etc/os-release
    DOCKER_DISTRO="debian"
    if [ "$ID" = "ubuntu" ]; then DOCKER_DISTRO="ubuntu"; fi
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/${DOCKER_DISTRO}/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DOCKER_DISTRO} ${VERSION_CODENAME} stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    ${PKG_UPDATE_CMD}
    ${PKG_INSTALL_CMD} docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
sudo groupadd docker 2>/dev/null || true
sudo usermod -aG docker ${USER}

# Start Docker daemon if not already running (e.g. no host socket)
if ! docker info &> /dev/null 2>&1; then
    echo "Starting Docker daemon..."
    sudo nohup dockerd > /tmp/dockerd.log 2>&1 &
    for i in $(seq 1 15); do
        if docker info &> /dev/null 2>&1; then
            echo "Docker daemon started successfully"
            break
        fi
        sleep 1
    done
    if ! docker info &> /dev/null 2>&1; then
        echo "WARNING: Docker daemon could not start. Check /tmp/dockerd.log"
    fi
fi

# Devbox setup
if ! command -v devbox &> /dev/null
then
    echo "devbox could not be found, installing"
    export PATH="$HOME/.devbox/bin:$PATH"
    curl -fsSL https://get.jetify.com/devbox | bash -s -- --force
fi
# Ensure nix is available and daemon is running
if [ -f /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh ]; then
    . /nix/var/nix/profiles/default/etc/profile.d/nix-daemon.sh
fi
if command -v nix-daemon > /dev/null 2>&1 && ! pgrep -x nix-daemon > /dev/null 2>&1; then
    echo "Starting nix daemon..."
    sudo nix-daemon &
    DAEMON_PID=$!
    # Wait for daemon socket (up to 30s)
    for i in $(seq 1 30); do
        if [ -S /nix/var/nix/daemon-socket/socket ]; then
            echo "Nix daemon socket ready."
            break
        fi
        echo "Waiting for nix daemon socket... ($i/30)"
        sleep 1
    done
fi
if command -v devbox &> /dev/null; then
    echo "Running devbox install..."
    yes | devbox install || echo "WARNING: devbox install failed, will retry on shell start"
fi

# DirEnv setup
touch .envrc
direnv allow .
# 

# Python and NodeJS setup
if [ "$PKG_MANAGER" = "apt-get" ]; then
    echo "Installing Python and Node apt-get."    
    ${PKG_INSTALL_CMD} python3-full python3-pip nodejs npm
elif [ "$PKG_MANAGER" = "yum" ]; then
    echo "Installing Python and Node using yum."
    ${PKG_INSTALL_CMD} python3 python3-pip nodejs npm
fi

# Livereload setup
if ! command -v livereload &> /dev/null
then
    echo "livereload could not be found, installing..."
    pip3 install livereload --break-system-packages
fi

# Port redirect: ensure 443 -> 10443 when missing
# curl -k https://local.env.daws25.com
if ! command -v iptables &> /dev/null
then
    echo "iptables could not be found, installing..."
    ${PKG_INSTALL_CMD} iptables
fi
if command -v iptables &> /dev/null
then
    if ! sudo iptables -w -t nat -C PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 10443 &> /dev/null; then
        echo "Adding iptables redirect: 443 -> 10443 (PREROUTING)"
        sudo iptables -w -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 10443
    fi
    if ! sudo iptables -w -t nat -C OUTPUT -d 127.0.0.1/32 -p tcp --dport 443 -j REDIRECT --to-ports 10443 &> /dev/null; then
        echo "Adding iptables redirect: 443 -> 10443 (OUTPUT localhost)"
        sudo iptables -w -t nat -A OUTPUT -d 127.0.0.1/32 -p tcp --dport 443 -j REDIRECT --to-ports 10443
    fi
else
    echo "iptables is unavailable; 443 -> 10443 redirect not configured."
fi

# System Info
echo "PWD: $(pwd)"

echo post-create.sh executed successfully.
