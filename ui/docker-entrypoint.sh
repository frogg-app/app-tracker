#!/bin/sh
set -e

# Runtime environment variable injection for React SPA
# This allows runtime configuration without rebuilding the image

# Create runtime config
cat > /usr/share/nginx/html/runtime-config.js << EOF
window.__RUNTIME_CONFIG__ = {
  API_URL: "${API_URL:-/api}",
  WS_URL: "${WS_URL:-/ws}",
  ENV: "${NODE_ENV:-production}"
};
EOF

echo "Runtime config generated:"
cat /usr/share/nginx/html/runtime-config.js

# Execute the main command
exec "$@"
