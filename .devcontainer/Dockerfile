FROM mcr.microsoft.com/devcontainers/base:bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       direnv \
       curl \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Ensure /tmp is writable for docker-in-docker feature
RUN chmod 1777 /tmp
