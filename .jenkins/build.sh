#!/bin/bash
set -e

echo "=== Building apptrackr ==="

# Build all Docker images via compose
docker-compose build || docker compose build

# Configure git

echo "Build completed successfully!"
