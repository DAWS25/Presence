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
sudo chown -R $USER /nix

# Docker setup
if ! command -v docker &> /dev/null; then
    echo "docker could not be found, installing..."
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
if ! getent group docker > /dev/null; then
    sudo groupadd docker
fi
sudo usermod -aG docker ${USER}

# DirEnv setup
touch .envrc
direnv allow .

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
