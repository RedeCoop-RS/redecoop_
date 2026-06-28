#!/bin/sh
set -eu

mkdir -p /var/lib/nginx/tmp/client_body /var/lib/nginx/logs /tmp/client_body

FRONTEND="${1:?usage: nginx-entrypoint.sh <website|dashboard|app-motorista>}"
CONF="/etc/nginx/frontends/${FRONTEND}.conf"

if [ ! -f "$CONF" ]; then
  echo "nginx config not found: $CONF" >&2
  exit 1
fi

exec nginx -g 'daemon off;' -c "$CONF"
