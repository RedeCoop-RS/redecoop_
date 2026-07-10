"""Busca UUIDs CAF na API pública (passo 1 do pipeline)."""
from __future__ import annotations

import asyncio
import glob
import json
import os
import re
from datetime import datetime
from pathlib import Path

import httpx

from consulta_caf_core import data_dir
from emit import log, phase, progress

CAF_CONSULTA_PUBLICA = "https://caf.mda.gov.br/api/pessoa-juridica/consulta-publica"

_UFS_BR = (
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT",
    "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
)


def _cnpj14(item: dict) -> str:
    raw = item.get("_cnpj_consultado") or item.get("cnpj") or ""
    return re.sub(r"\D", "", raw)


def _row_cnpj14(row: dict) -> str:
    raw = row.get("cnpj") or row.get("numeroCnpj") or row.get("numeroDocumento") or ""
    return re.sub(r"\D", "", str(raw))


def _iter_listas_em_payload(data: object) -> list[list]:
    out: list[list] = []
    if not isinstance(data, dict):
        return out
    if data.get("id") and (data.get("cnpj") is not None or data.get("numeroCnpj") is not None):
        out.append([data])
    for key in ("dados", "data", "registros", "resultados", "lista", "content", "items"):
        v = data.get(key)
        if isinstance(v, list) and v and isinstance(v[0], dict):
            out.append(v)
        elif isinstance(v, dict):
            for k2 in ("dados", "data", "registros", "content", "items"):
                v2 = v.get(k2)
                if isinstance(v2, list) and v2 and isinstance(v2[0], dict):
                    out.append(v2)
    return out


def _pick_row_para_cnpj(payload: dict, cnpj14: str) -> dict | None:
    for lista in _iter_listas_em_payload(payload):
        for row in lista:
            if isinstance(row, dict) and row.get("id") and _row_cnpj14(row) == cnpj14:
                return row
    for v in payload.values():
        if isinstance(v, dict) and v.get("id") and _row_cnpj14(v) == cnpj14:
            return v
    return None


def _digitos_verificadores_cnpj_base12(base12: str) -> tuple[int, int]:
    w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s = sum(int(base12[i]) * w1[i] for i in range(12))
    d1 = 0 if s % 11 < 2 else 11 - s % 11
    w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s2 = sum(int(base12[i]) * w2[i] for i in range(12)) + d1 * w2[12]
    d2 = 0 if s2 % 11 < 2 else 11 - s2 % 11
    return d1, d2


def _matriz_cnpj14(cnpj14: str) -> str | None:
    d = re.sub(r"\D", "", cnpj14)
    if len(d) != 14 or d[8:12] == "0001":
        return None
    base12 = d[:8] + "0001"
    d1, d2 = _digitos_verificadores_cnpj_base12(base12)
    return f"{base12}{d1}{d2}"


def _cnpjs_variantes_busca(cnpj14: str) -> list[str]:
    d = re.sub(r"\D", "", cnpj14)
    if len(d) != 14:
        return [d] if d else []
    out = [d]
    m = _matriz_cnpj14(d)
    if m and m not in out:
        out.append(m)
    return out


def _ufs_tentativa(uf_preferida: str) -> list[str | None]:
    u0 = (uf_preferida or "RS").strip().upper()[:2] or "RS"
    rest = [u for u in _UFS_BR if u != u0]
    return [u0, *rest, None]


async def _get_um_pedido(client, cnpj14, *, uf, captcha_proof, user_agent):
    headers = {
        "User-Agent": user_agent,
        "x-captcha-proof": captcha_proof,
        "Referer": "https://caf.mda.gov.br/consulta-publica/pessoa-juridica",
        "Origin": "https://caf.mda.gov.br",
        "Accept": "application/json, text/plain, */*",
    }
    params: dict = {"cnpj": cnpj14, "pagina": 1, "tamanhoPagina": 10}
    if uf is not None:
        params["uf"] = uf
    resp = await client.get(CAF_CONSULTA_PUBLICA, params=params, headers=headers)
    snippet = (resp.text or "")[:180].replace("\n", " ")
    novo_proof = None
    if resp.status_code == 200:
        try:
            data = resp.json()
            if isinstance(data, dict):
                p = data.get("captchaProof")
                if isinstance(p, str) and p:
                    novo_proof = p
            row = _pick_row_para_cnpj(data, cnpj14) if isinstance(data, dict) else None
            return row, resp.status_code, snippet, novo_proof
        except Exception:
            pass
    return None, resp.status_code, snippet, novo_proof


async def _get_registro_varrendo(cnpj_pedido, client, uf, proof_holder, user_agent):
    proof = proof_holder[0]
    last = (None, 0, "", None)
    for cand in _cnpjs_variantes_busca(cnpj_pedido):
        for uf_try in _ufs_tentativa(uf):
            item, status, snippet, novo = await _get_um_pedido(
                client, cand, uf=uf_try, captcha_proof=proof, user_agent=user_agent
            )
            last = (item, status, snippet, uf_try)
            if novo:
                proof_holder[0] = novo
                proof = novo
            if item:
                return item, cand
            if status != 200:
                break
            await asyncio.sleep(0.1)
        await asyncio.sleep(0.12)
    return None, cnpj_pedido


def _carregar_ultimo_resultados() -> tuple[dict, str | None]:
    dd = data_dir()
    os.makedirs(dd, exist_ok=True)
    arquivos = sorted(glob.glob(os.path.join(dd, "caf_resultados_*.json")), reverse=True)
    if not arquivos:
        return {"resultados": [], "erros": [], "total": 0}, None
    with open(arquivos[0], encoding="utf-8") as f:
        return json.load(f), arquivos[0]


def _merge_por_cnpj(anterior: dict, novos_itens: list[dict], novos_erros: list[str]) -> dict:
    by_cnpj: dict[str, dict] = {}
    for it in anterior.get("resultados", []):
        k = _cnpj14(it)
        if k and it.get("id"):
            by_cnpj[k] = it
    for it in novos_itens:
        k = _cnpj14(it)
        if k and it.get("id"):
            by_cnpj[k] = it
    erros_set = set(anterior.get("erros", []))
    erros_set.update(novos_erros)
    for it in by_cnpj.values():
        k = _cnpj14(it)
        if k:
            erros_set.discard(k)
    resultados = list(by_cnpj.values())
    resultados.sort(key=_cnpj14)
    return {"resultados": resultados, "erros": sorted(erros_set), "total": len(resultados)}


async def buscar_ids(
    cnpjs: list[str],
    *,
    captcha_proof: str,
    user_agent: str,
    uf: str = "RS",
) -> tuple[dict, str, list[str]]:
    """Retorna (merged_json, path_arquivo, cnpjs_sem_id)."""
    phase("ids", f"Buscando UUIDs CAF para {len(cnpjs)} CNPJ(s)…")
    anterior, _ = _carregar_ultimo_resultados()
    novos: list[dict] = []
    novos_erros: list[str] = []
    proof_holder = [captcha_proof]
    total = len(cnpjs)

    async with httpx.AsyncClient(verify=False, timeout=60) as client:
        for i, cnpj in enumerate(cnpjs, 1):
            progress(i, total, f"Consultando CNPJ {cnpj}")
            try:
                item, cand = await _get_registro_varrendo(cnpj, client, uf, proof_holder, user_agent)
                if item:
                    item["_cnpj_consultado"] = cnpj
                    novos.append(item)
                    log(f"✓ {cnpj} → id {item.get('id')} ({(item.get('razaoSocial') or '')[:40]})", "success")
                else:
                    novos_erros.append(cnpj)
                    log(f"✗ {cnpj} — UUID não encontrado na API", "warn")
            except Exception as e:
                novos_erros.append(cnpj)
                log(f"✗ {cnpj} — {type(e).__name__}: {e}", "error")
            await asyncio.sleep(0.2)

    merged = _merge_por_cnpj(anterior, novos, novos_erros)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = os.path.join(data_dir(), f"caf_resultados_{ts}.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    alvo_set = set(cnpjs)
    com_id = {_cnpj14(it) for it in merged.get("resultados", []) if it.get("id")}
    sem_id = sorted(alvo_set - com_id)
    log(f"IDs gravados em {Path(out).name} — {len(com_id & alvo_set)}/{len(cnpjs)} com UUID.", "info")
    return merged, out, sem_id
