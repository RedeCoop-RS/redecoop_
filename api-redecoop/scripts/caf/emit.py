"""Emite eventos JSON (uma linha por evento) para o NestJS consumir via stdout."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def emit(event: str, **payload) -> None:
    line = json.dumps({"event": event, "ts": _now(), **payload}, ensure_ascii=False)
    print(line, flush=True)


def log(message: str, level: str = "info") -> None:
    emit("log", level=level, message=message)


def phase(name: str, message: str, **extra) -> None:
    emit("phase", phase=name, message=message, **extra)


def progress(current: int, total: int, message: str = "") -> None:
    emit("progress", current=current, total=total, message=message)


def done(**result) -> None:
    emit("done", result=result)


def fail(message: str) -> None:
    emit("error", message=message)
    sys.exit(1)
