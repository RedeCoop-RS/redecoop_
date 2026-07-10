#!/usr/bin/env bash
# ── VNC para sincronização CAF (hCaptcha no servidor) ──
# Executar na VPS como root: bash scripts/caf/setup-vnc.sh
set -euo pipefail

DISPLAY_NUM="${CAF_DISPLAY_NUM:-1}"
GEOMETRY="${CAF_VNC_GEOMETRY:-1920x1080}"
DEPTH="${CAF_VNC_DEPTH:-24}"
VNC_USER="${CAF_VNC_USER:-root}"

echo "==> Instalando TigerVNC + ambiente gráfico leve (Openbox)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  tigervnc-standalone-server tigervnc-common \
  openbox obconf xterm dbus-x11 \
  fonts-liberation fonts-dejavu-core

VNC_HOME="$(eval echo "~${VNC_USER}")"
VNC_DIR="${VNC_HOME}/.vnc"
mkdir -p "${VNC_DIR}"

if [[ ! -f "${VNC_DIR}/passwd" ]]; then
  echo ""
  echo "Defina a senha VNC (mín. 6 caracteres) — usada para conectar no hCaptcha:"
  su - "${VNC_USER}" -c "vncpasswd"
fi

XSTARTUP="${VNC_DIR}/xstartup"
cat > "${XSTARTUP}" << 'EOF'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
xrdb "$HOME/.Xresources" 2>/dev/null || true
xsetroot -solid "#2d2d2d"
openbox-session &
EOF
chmod +x "${XSTARTUP}"
chown -R "${VNC_USER}:${VNC_USER}" "${VNC_DIR}" 2>/dev/null || true

UNIT="/etc/systemd/system/caf-vnc@${DISPLAY_NUM}.service"
cat > "${UNIT}" << EOF
[Unit]
Description=CAF TigerVNC display :${DISPLAY_NUM}
After=network.target

[Service]
Type=forking
User=${VNC_USER}
WorkingDirectory=${VNC_HOME}
PIDFile=${VNC_DIR}/:${DISPLAY_NUM}.pid
ExecStartPre=/usr/bin/vncserver -kill :${DISPLAY_NUM} > /dev/null 2>&1 || true
ExecStart=/usr/bin/vncserver :${DISPLAY_NUM} -geometry ${GEOMETRY} -depth ${DEPTH} -localhost yes
ExecStop=/usr/bin/vncserver -kill :${DISPLAY_NUM}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "caf-vnc@${DISPLAY_NUM}.service"
systemctl restart "caf-vnc@${DISPLAY_NUM}.service"

PORT=$((5900 + DISPLAY_NUM))
echo ""
echo "✓ VNC ativo no display :${DISPLAY_NUM} (porta ${PORT}, só localhost)."
echo ""
echo "  No .env da API (PM2):"
echo "    CAF_BROWSER_MODE=vnc"
echo "    CAF_DISPLAY=:${DISPLAY_NUM}"
echo "    CAF_VNC_HOST=85.31.231.192"
echo "    CAF_VNC_PORT=${PORT}"
echo ""
echo "  Túnel SSH (recomendado — mais seguro):"
echo "    ssh -L ${PORT}:127.0.0.1:${PORT} root@85.31.231.192"
echo "  Cliente VNC: localhost:${PORT}"
echo ""
echo "  Reinicie a API: pm2 restart redecoop-backend"
