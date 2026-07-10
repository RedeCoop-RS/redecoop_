"""Extrato CAF + quadro societário (passo 2 — baseado em consulta_caf2)."""
from __future__ import annotations

import asyncio
import re
import time
from collections import defaultdict
from io import BytesIO

import httpx
import pdfplumber

from consulta_caf_core import CAF_BASE, parsear_pdf, refresh_token_se_necessario
from emit import log, phase, progress

_RE_CAF = re.compile(r"[A-Z]{2}[\*\d]+\.[\*\d]+\.[\*\d]+(\d{4,})(?:CAF)?", re.IGNORECASE)
_MAX_TENTATIVAS = 10
_DEFAULT_WORKERS = 6


def _pdf_headers(captcha_proof: str, user_agent: str) -> dict:
    return {
        "User-Agent": user_agent,
        "x-captcha-proof": captcha_proof,
        "Referer": "https://caf.mda.gov.br/consulta-publica/pessoa-juridica",
        "Origin": "https://caf.mda.gov.br",
        "Accept": "application/pdf,*/*",
    }


def _extrair_texto_pdf(pdf_bytes: bytes) -> str:
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def parsear_socios_pdf(pdf_bytes: bytes) -> list[str]:
    return _RE_CAF.findall(_extrair_texto_pdf(pdf_bytes))


def parsear_falhas_pdf(pdf_bytes: bytes) -> int:
    texto = _extrair_texto_pdf(pdf_bytes)
    linhas = re.findall(r"^\s*(\d+)\s+\S", texto, re.MULTILINE)
    if linhas:
        return max(int(n) for n in linhas)
    return len(re.findall(r"\*{3}\.\*{3}\.\*{3}-\*{2}", texto))


def carregar_cooperativas_alvo(resultados_json: dict) -> list[dict]:
    alvos: list[dict] = []
    for item in resultados_json.get("resultados", []):
        tipo = (item.get("tipo") or "").strip().lower()
        if "singular" not in tipo and "central" not in tipo:
            continue
        cnpj = re.sub(r"\D", "", item.get("cnpj", item.get("_cnpj_consultado", "")))
        uuid = item.get("id", "")
        if cnpj and uuid:
            alvos.append({"cnpj": cnpj, "id": uuid, "razaoSocial": item.get("razaoSocial", "")})
    return alvos


async def _baixar_pdf(client, headers, url):
    try:
        resp = await client.get(url, headers=headers)
    except Exception as e:
        return None, 0, str(e)
    if resp.status_code != 200:
        return None, resp.status_code, f"HTTP {resp.status_code}"
    ct = resp.headers.get("content-type", "")
    if "pdf" not in ct and not resp.content.startswith(b"%PDF"):
        return None, resp.status_code, "Resposta não é PDF"
    return resp.content, resp.status_code, None


async def _baixar_pdf_authed(client, holder, lock, url):
    for _ in range(_MAX_TENTATIVAS):
        async with lock:
            await refresh_token_se_necessario(holder)
            h = _pdf_headers(holder[0], holder[1])
        blob, st, err = await _baixar_pdf(client, h, url)
        if st in (401, 403):
            from consulta_caf_core import capturar_token
            async with lock:
                log(f"HTTP {st} — nova verificação humana…", "warn")
                p, ua = await capturar_token()
                holder[0], holder[1] = p, ua
            continue
        return blob, st, err
    return None, 0, "Máximo de tentativas"


async def consultar_extratos(
    token_holder: list[str],
    alvos: list[dict],
    *,
    workers: int = _DEFAULT_WORKERS,
) -> tuple[list[dict], list[str], dict]:
    lock = asyncio.Lock()
    sem = asyncio.Semaphore(max(1, workers))
    total = len(alvos)
    phase("extratos", f"Baixando extratos CAF ({total} cooperativa(s))…")

    async def uma_coop(client, coop, idx):
        cnpj, uuid = coop["cnpj"], coop["id"]
        nome = (coop["razaoSocial"] or "")[:50]
        url_doc = f"{CAF_BASE}/{uuid}/consulta-publica/extrato/documento"
        url_socios = f"{CAF_BASE}/{uuid}/consulta-publica/extrato/socios"
        url_falhas = f"{CAF_BASE}/{uuid}/consulta-publica/extrato/falhas"

        async with sem:
            progress(idx, total, f"Baixando {cnpj}")
            pdf_doc, pdf_soc, pdf_fal = await asyncio.gather(
                _baixar_pdf_authed(client, token_holder, lock, url_doc),
                _baixar_pdf_authed(client, token_holder, lock, url_socios),
                _baixar_pdf_authed(client, token_holder, lock, url_falhas),
            )

        out = {"cnpj": cnpj, "uuid": uuid, "extrato": None, "erro": False, "finais_caf": [], "total_falhas": 0}
        blob_doc, st_doc, err_doc = pdf_doc
        if blob_doc:
            try:
                dados = await asyncio.to_thread(parsear_pdf, blob_doc, cnpj)
                dados["caf_uuid"] = uuid
                out["extrato"] = dados
                sit = (dados.get("situacao") or "")[:20]
                log(
                    f"✓ [{idx}/{total}] {cnpj} M:{dados.get('masculino')} F:{dados.get('feminino')} [{sit}] {nome}",
                    "success",
                )
            except Exception as e:
                out["erro"] = True
                log(f"✗ [{idx}/{total}] {cnpj} parse: {e}", "error")
        else:
            out["erro"] = True
            log(f"✗ [{idx}/{total}] {cnpj} extrato: {err_doc or st_doc}", "error")

        blob_s, _, _ = pdf_soc
        if blob_s:
            try:
                out["finais_caf"] = await asyncio.to_thread(parsear_socios_pdf, blob_s)
            except Exception:
                pass
        blob_f, _, _ = pdf_fal
        if blob_f:
            try:
                out["total_falhas"] = await asyncio.to_thread(parsear_falhas_pdf, blob_f)
            except Exception:
                pass
        return out

    t0 = time.perf_counter()
    async with httpx.AsyncClient(verify=False, timeout=120) as client:
        tarefas = [uma_coop(client, coop, i) for i, coop in enumerate(alvos, 1)]
        brutos = await asyncio.gather(*tarefas)
    log(f"Extratos concluídos em {time.perf_counter() - t0:.1f}s.", "info")

    extratos: list[dict] = []
    erros: list[str] = []
    dup_aux: dict[str, dict] = {}
    for r in brutos:
        if r["extrato"]:
            extratos.append(r["extrato"])
        elif r["erro"]:
            erros.append(r["cnpj"])
        dup_aux[r["cnpj"]] = {
            "finais_caf": r["finais_caf"],
            "totalSocios": len(r["finais_caf"]),
            "totalFalhas": r["total_falhas"],
            "caf_uuid": r["uuid"],
        }
    return extratos, erros, dup_aux


def analisar_duplicatas(dup_aux: dict) -> dict:
    mapa: dict[str, list[str]] = defaultdict(list)
    for cnpj, dados in dup_aux.items():
        for final in dados["finais_caf"]:
            if final:
                mapa[final].append(cnpj)
    duplicados = {f: coops for f, coops in mapa.items() if len(set(coops)) > 1}
    por_coop: dict[str, dict] = {}
    for cnpj, dados in dup_aux.items():
        dup_count = sum(
            1 for final in set(dados["finais_caf"]) if final in duplicados and cnpj in duplicados[final]
        )
        total = dados["totalSocios"]
        por_coop[cnpj] = {
            "totalComCaf": total,
            "duplicadosEmOutrasCoops": dup_count,
            "unicosCaf": total - dup_count,
            "totalSemCaf": dados["totalFalhas"],
        }
    return {"duplicados": duplicados, "por_coop": por_coop}


def mesclar_composicao_societaria(extratos: list[dict], dup_aux: dict, analise: dict) -> None:
    por_coop = analise["por_coop"]
    dups = analise["duplicados"]
    dup_limite = {k: list(set(v)) for k, v in list(dups.items())[:120]}
    for r in extratos:
        cnpj = re.sub(r"\D", "", r.get("cnpj") or r.get("_cnpj_consultado", ""))
        d = dup_aux.get(cnpj, {})
        st = por_coop.get(cnpj, {})
        r["composicao_societaria"] = {
            "origem": "caf_sync_quadro_societario",
            "cafUuid": r.get("caf_uuid"),
            "finaisCafAssociados": d.get("finais_caf", []),
            "totalSociosComCafPdf": d.get("totalSocios", 0),
            "totalSociosSemCafPdf": d.get("totalFalhas", 0),
            "analisePorCoop": {
                "unicosCaf": st.get("unicosCaf"),
                "duplicadosEmOutrasCoops": st.get("duplicadosEmOutrasCoops"),
                "totalComCafBrutoQuadro": st.get("totalComCaf"),
                "totalSemCafQuadro": st.get("totalSemCaf"),
            },
            "duplicadosEntreCooperativas": dup_limite,
        }
