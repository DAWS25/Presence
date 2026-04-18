FROM mcr.microsoft.com/devcontainers/python:3.14-bookworm

# System dependencies (direnv, iptables)
RUN apt-get update && apt-get install -y --no-install-recommends \
    direnv \
    iptables \
    && rm -rf /var/lib/apt/lists/*

# Install livereload
RUN python3 -m pip install --no-cache-dir livereload

# Prepare Nix store for vscode user
RUN mkdir -p /nix && chown -R vscode:vscode /nix

USER vscode

# Install Nix (single-user, no daemon — appropriate for containers)
RUN curl -L https://nixos.org/nix/install | sh -s -- --no-daemon

# Install devbox
ENV PATH="/home/vscode/.local/bin:/home/vscode/.nix-profile/bin:${PATH}"
RUN curl -fsSL https://get.jetify.com/devbox | bash -s -- --force

# Shell integration: nix, direnv
RUN { \
      echo ''; \
      echo '# Nix'; \
      echo '[ -e "$HOME/.nix-profile/etc/profile.d/nix.sh" ] && . "$HOME/.nix-profile/etc/profile.d/nix.sh"'; \
      echo ''; \
      echo '# Direnv'; \
      echo 'eval "$(direnv hook bash)"'; \
    } >> "$HOME/.bashrc"

USER root
