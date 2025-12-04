#!/bin/bash

set -euo pipefail

# Cache directories on the host
HOST_CACHE_DIR="$(pwd)/.cache"
CARGO_REGISTRY_HOST_DIR="$HOST_CACHE_DIR/cargo/registry"
CARGO_GIT_HOST_DIR="$HOST_CACHE_DIR/cargo/git"
NPM_CACHE_HOST_DIR="$HOST_CACHE_DIR/npm"

mkdir -p "$CARGO_REGISTRY_HOST_DIR" "$CARGO_GIT_HOST_DIR" "$NPM_CACHE_HOST_DIR"

docker run -it --rm \
  -v "$CARGO_REGISTRY_HOST_DIR":/home/tauri/.cargo/registry \
  -v "$CARGO_GIT_HOST_DIR":/home/tauri/.cargo/git \
  -v "$NPM_CACHE_HOST_DIR":/home/tauri/.npm \
  -v "$(pwd)":/app \
  -e CARGO_HOME=/home/tauri/.cargo \
  --workdir /app \
  registry.gitlab.com/mokhtarabadi/tauri-build-toolchain:2.10.2 \
  /bin/bash -c 'yarn && yarn release --target aarch64-unknown-linux-gnu --target x86_64-unknown-linux-gnu --target armv7-unknown-linux-gnueabihf --publish'
