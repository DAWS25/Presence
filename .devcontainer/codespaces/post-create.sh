#!/bin/bash
set -euo pipefail

LOG_FILE="/tmp/post-create.log"

log() {
    local msg="[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] $*"
    echo "$msg" | tee -a "$LOG_FILE"
}

log "========== post-create.sh started =========="
log "User: $(whoami) | Home: $HOME | PWD: $(pwd)"

# Source Nix environment (installed in Dockerfile)
if [ -e "$HOME/.nix-profile/etc/profile.d/nix.sh" ]; then
    . "$HOME/.nix-profile/etc/profile.d/nix.sh"
fi
export PATH="$HOME/.local/bin:$PATH"

# Devbox: install nix packages declared in devbox.json
log "--- Devbox install ---"
log "devbox version: $(devbox version)"
yes | devbox install
log "devbox install complete."

# Direnv: create .envrc for devbox integration
log "--- Direnv setup ---"
if ! grep -q 'devbox' .envrc 2>/dev/null; then
    echo 'eval "$(devbox generate direnv --print-envrc)"' > .envrc
fi
direnv allow .
log "Direnv configured."

# Docker group (Docker socket is provided by Codespaces host)
log "--- Docker setup ---"
if command -v docker &> /dev/null; then
    if ! getent group docker > /dev/null 2>&1; then
        sudo groupadd docker
    fi
    sudo usermod -aG docker "${USER}"
    log "Docker group configured."
fi

# Livereload
log "--- Livereload setup ---"
if ! command -v livereload &> /dev/null; then
    pip install livereload
    log "livereload installed."
fi

# Port redirect: 443 -> 10443
log "--- Port redirect setup ---"
if command -v iptables &> /dev/null; then
    sudo iptables -w -t nat -C PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 10443 2>/dev/null \
        || sudo iptables -w -t nat -A PREROUTING -p tcp --dport 443 -j REDIRECT --to-ports 10443
    sudo iptables -w -t nat -C OUTPUT -d 127.0.0.1/32 -p tcp --dport 443 -j REDIRECT --to-ports 10443 2>/dev/null \
        || sudo iptables -w -t nat -A OUTPUT -d 127.0.0.1/32 -p tcp --dport 443 -j REDIRECT --to-ports 10443
    log "Port redirects configured."
fi

# Port visibility (Codespaces only)
if [ -n "${CODESPACE_NAME:-}" ]; then
    log "--- Port visibility ---"
    gh codespace ports visibility 10080:public 10443:public -c "$CODESPACE_NAME"
    log "Port visibility set."
fi

log "========== post-create.sh completed =========="
log "Log: $LOG_FILE"
