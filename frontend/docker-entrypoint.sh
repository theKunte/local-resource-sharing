#!/bin/sh
set -e

# Generate runtime config.js from environment variables
# This runs when the container starts, NOT during build
cat > /usr/share/nginx/html/config.js << EOF
// Runtime configuration - generated from environment variables
window.RUNTIME_CONFIG = {
  FIREBASE_API_KEY: "${VITE_FIREBASE_API_KEY:-}",
  FIREBASE_AUTH_DOMAIN: "${VITE_FIREBASE_AUTH_DOMAIN:-}",
  FIREBASE_PROJECT_ID: "${VITE_FIREBASE_PROJECT_ID:-}",
  FIREBASE_STORAGE_BUCKET: "${VITE_FIREBASE_STORAGE_BUCKET:-}",
  FIREBASE_MESSAGING_SENDER_ID: "${VITE_FIREBASE_MESSAGING_SENDER_ID:-}",
  FIREBASE_APP_ID: "${VITE_FIREBASE_APP_ID:-}",
  FIREBASE_MEASUREMENT_ID: "${VITE_FIREBASE_MEASUREMENT_ID:-}",
  API_URL: "${VITE_API_URL:-}"
};
EOF

echo "Runtime configuration generated successfully"

# Start nginx
exec "$@"
