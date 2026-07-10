"""Ambiente de navegador: local (dev) ou VNC (servidor Linux)."""
from __future__ import annotations

import os
import sys


def browser_mode() -> str:
    """local | vnc | auto"""
    return (os.environ.get("CAF_BROWSER_MODE") or "auto").strip().lower()


def is_vnc_mode() -> bool:
    mode = browser_mode()
    if mode == "vnc":
        return True
    if mode == "local":
        return False
    # auto: Linux sem sessão gráfica local → VNC
    return sys.platform.startswith("linux")


def ensure_display() -> str:
    display = (os.environ.get("DISPLAY") or os.environ.get("CAF_DISPLAY") or ":1").strip()
    if not display.startswith(":"):
        display = f":{display.lstrip(':')}"
    os.environ["DISPLAY"] = display
    return display


def chromium_launch_kwargs() -> dict:
    if is_vnc_mode():
        ensure_display()
    args = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1920,1080",
    ]
    if is_vnc_mode():
        args.append("--start-maximized")
    return {"headless": False, "args": args}


def vnc_connection_hint() -> dict:
    host = (
        os.environ.get("CAF_VNC_PUBLIC_HOST")
        or os.environ.get("CAF_VNC_HOST")
        or "IP-DO-SERVIDOR"
    )
    port = os.environ.get("CAF_VNC_PORT", "5901")
    display = os.environ.get("DISPLAY") or os.environ.get("CAF_DISPLAY") or ":1"
    return {
        "mode": "vnc" if is_vnc_mode() else "local",
        "host": host,
        "port": port,
        "display": display,
        "tunnel": f"ssh -L {port}:127.0.0.1:{port} root@{host}",
    }


def capturar_token_messages() -> tuple[str, str]:
    if is_vnc_mode():
        hint = vnc_connection_hint()
        phase_msg = (
            f"Conecte no VNC ({hint['host']}:{hint['port']}), resolva o hCaptcha "
            "e pesquise qualquer CNPJ."
        )
        log_msg = (
            f"VNC ativo — display {hint['display']}. "
            f"Cliente: {hint['host']}:{hint['port']} "
            f"(recomendado: túnel {hint['tunnel']})"
        )
        return phase_msg, log_msg
    phase_msg = "Resolva o hCaptcha no navegador que abriu e pesquise um CNPJ."
    log_msg = "Aguardando interação humana no hCaptcha (navegador local)…"
    return phase_msg, log_msg
