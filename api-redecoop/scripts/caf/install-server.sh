#!/usr/bin/env bash
# ── Dependências Python + Playwright para CAF na VPS ──
# Executar na raiz do api-redecoop: bash scripts/caf/install-server.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CAF_DIR="${ROOT}/scripts/caf"
VENV="${CAF_DIR}/.venv"

echo "==> Pacotes do sistema (Chromium / Playwright)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  python3 python3-pip python3-venv \
  libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 \
  libasound2 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  fonts-liberation fonts-dejavu-core

echo "==> Virtualenv em ${VENV}…"
python3 -m venv "${VENV}"
"${VENV}/bin/pip" install -U pip wheel
"${VENV}/bin/pip" install -r "${CAF_DIR}/requirements.txt"
"${VENV}/bin/playwright" install chromium
"${VENV}/bin/playwright" install-deps chromium || true

mkdir -p "${CAF_DIR}/data"
touch "${CAF_DIR}/data/.gitkeep"

echo ""
echo "✓ CAF Python pronto."
echo ""
echo "  Adicione ao .env da API:"
echo "    CAF_PYTHON=${VENV}/bin/python"
echo "    CAF_BROWSER_MODE=vnc"
echo "    CAF_DISPLAY=:1"
echo "    CAF_VNC_HOST=85.31.231.192"
echo "    CAF_VNC_PORT=5901"
echo ""
echo "  Depois rode: bash scripts/caf/setup-vnc.sh"
echo "  E reinicie: pm2 restart redecoop-backend"
