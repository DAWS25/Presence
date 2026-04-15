FROM mcr.microsoft.com/devcontainers/base:bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends direnv \
    && rm -rf /var/lib/apt/lists/*
