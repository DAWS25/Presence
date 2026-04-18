FROM mcr.microsoft.com/devcontainers/base:bookworm

ARG PYTHON_VERSION=3.14.0

# System dependencies (build tools for Python, direnv, iptables)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    zlib1g-dev \
    libbz2-dev \
    libreadline-dev \
    libsqlite3-dev \
    libncursesw5-dev \
    xz-utils \
    tk-dev \
    libxml2-dev \
    libxmlsec1-dev \
    libffi-dev \
    liblzma-dev \
    direnv \
    iptables \
    && rm -rf /var/lib/apt/lists/*

# Build and install Python 3.14 from source with pip
RUN curl -fsSL "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tgz" \
        -o /tmp/python.tgz \
    && tar -xzf /tmp/python.tgz -C /tmp \
    && cd "/tmp/Python-${PYTHON_VERSION}" \
    && ./configure --with-ensurepip=install \
    && make -j"$(nproc)" \
    && make altinstall \
    && ln -sf /usr/local/bin/python3.14 /usr/local/bin/python3 \
    && ln -sf /usr/local/bin/python3.14 /usr/local/bin/python \
    && ln -sf /usr/local/bin/pip3.14 /usr/local/bin/pip3 \
    && ln -sf /usr/local/bin/pip3.14 /usr/local/bin/pip \
    && python3 -m pip install --upgrade pip \
    && python3 -m pip install livereload \
    && rm -rf /tmp/python.tgz "/tmp/Python-${PYTHON_VERSION}"

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
