"""
Núcleo CAF — parse PDF, MySQL upsert, captura de token (hCaptcha humano).
Variáveis de ambiente: DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import re
import time
from datetime import datetime
from io import BytesIO

import pdfplumber
from playwright.async_api import async_playwright

from emit import log, phase, progress
from browser_env import capturar_token_messages, chromium_launch_kwargs, is_vnc_mode, vnc_connection_hint

CAF_BASE = "https://caf.mda.gov.br/api/pessoa-juridica"
_CAPTCHA_RENOVAR_SEG = 90

CAF_COLS = (
    "cooperative_id", "cnpj", "cafe_uuid", "numero_caf", "razao_social", "situacao",
    "tipo_pessoa_juridica", "municipio", "uf", "data_inscricao", "data_validade",
    "ultima_atualizacao", "representante_legal", "total_com_caf", "total_sem_caf",
    "percentual_com_caf", "masculino", "feminino", "data_envio_composicao",
    "categorias", "atividades", "municipios_socios", "composicao_societaria", "consulted_at",
)


def mysql_config() -> dict:
    return {
        "host": os.environ.get("DATABASE_HOST", "127.0.0.1"),
        "port": int(os.environ.get("DATABASE_PORT", "3306")),
        "user": os.environ.get("DATABASE_USERNAME", "redecoop"),
        "password": os.environ.get("DATABASE_PASSWORD", ""),
        "database": os.environ.get("DATABASE_NAME", "redecoopapi"),
        "charset": "utf8mb4",
    }


def data_dir() -> str:
    return os.environ.get("CAF_DATA_DIR", os.path.join(os.path.dirname(__file__), "data"))


def _jwt_exp_unix(captcha_proof: str) -> float | None:
    try:
        parts = captcha_proof.split(".")
        if len(parts) < 2:
            return None
        payload_b64 = parts[1].encode("ascii")
        pad = (-len(payload_b64)) % 4
        if pad:
            payload_b64 += b"=" * pad
        data = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
        exp = data.get("exp")
        return float(exp) if exp is not None else None
    except Exception:
        return None


async def capturar_token() -> tuple[str, str]:
    captcha_proof = None
    user_agent = None

    phase_msg, log_msg = capturar_token_messages()
    phase("captcha", phase_msg)
    log(log_msg, "warn")
    if is_vnc_mode():
        hint = vnc_connection_hint()
        log(
            f"Chromium abrirá no display {hint['display']} — veja a janela pelo VNC.",
            "info",
        )

    async with async_playwright() as p:
        browser = await p.chromium.launch(**chromium_launch_kwargs())
        page = await browser.new_page()
        user_agent = await page.evaluate("navigator.userAgent")

        async def on_response(response):
            nonlocal captcha_proof
            if "caf.mda.gov.br/api" not in response.url or response.status != 200:
                return
            try:
                data = await response.json()
                if data.get("captchaProof") and not captcha_proof:
                    captcha_proof = data["captchaProof"]
                    log("Token capturado — fechando navegador.", "success")
            except Exception:
                pass

        page.on("response", on_response)
        await page.goto("https://caf.mda.gov.br/consulta-publica/pessoa-juridica")

        for _ in range(600):
            if captcha_proof:
                break
            await asyncio.sleep(0.5)

        await browser.close()

    if not captcha_proof:
        raise TimeoutError("Token não capturado. Resolva o hCaptcha e tente novamente.")
    return captcha_proof, user_agent


async def refresh_token_se_necessario(holder: list[str]) -> None:
    proof = holder[0]
    exp = _jwt_exp_unix(proof)
    if exp is None:
        return
    if time.time() < exp - _CAPTCHA_RENOVAR_SEG:
        return
    log("Token expirando — nova verificação humana necessária.", "warn")
    novo_p, novo_ua = await capturar_token()
    holder[0], holder[1] = novo_p, novo_ua


def parsear_pdf(pdf_bytes: bytes, cnpj: str) -> dict:
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        texto = "\n".join(page.extract_text() or "" for page in pdf.pages)

    def buscar(pattern, default=""):
        m = re.search(pattern, texto)
        return m.group(1).strip() if m else default

    def buscar_int(pattern) -> int:
        m = re.search(pattern, texto)
        return int(m.group(1).replace(".", "").replace(",", "")) if m else 0

    numero_caf = buscar(r"Nº CAF:\s*(\S+)\s+Situação:")
    numero_caf = re.sub(r"CAF$", "", numero_caf).strip()
    situacao = buscar(r"Situação:\s*([A-ZÁÉÍÓÚÂÊÎÔÛÃẼĨÕŨÇ]+)")
    data_inscricao = buscar(r"Data da inscri[çc][ãa]o:\s*([\d/]+)")
    ultima_atualizacao = buscar(r"[UÚ]ltima atualiza[çc][ãa]o:\s*([\d/]+)")
    data_validade = buscar(r"Data de Validade:\s*([\d/]+)")
    razao_social = buscar(r"Raz[ãa]o Social:\s*(.+)")
    cnpj_doc = buscar(r"CNPJ:\s*([\d.\/\-]+)\s+Tipo")
    tipo_pj = buscar(r"Tipo Pessoa Jur[íi]dica:\s*([^\n]+?)\s+Data de Constitui")
    municipio = buscar(r"Munic[íi]pio:\s*([^\s].*?)\s+UF:")
    uf = buscar(r"\bUF:\s*([A-Z]{2})\b")
    representante = buscar(r"Representante Legal:\s*(.+?)\s+CPF:")
    feminino = buscar_int(r"Feminino\s+([\d.,]+)\s")
    masculino = buscar_int(r"Masculino\s+([\d.,]+)\s")
    total_com_caf = buscar_int(r"associados com inscri[çc][õo]es ativa no CAF\s+([\d.,]+)")
    total_sem_caf = buscar_int(r"associados sem inscri[çc][õo]es no CAF\s+([\d.,]+)")
    total_geral = total_com_caf + total_sem_caf
    percentual_com = round(total_com_caf / total_geral * 100, 2) if total_geral > 0 else 0.0

    def parse_categoria(nome: str) -> dict:
        pattern = re.escape(nome) + r"\s+(\d+[\d.]*)\s+([\d.,]+)"
        m = re.search(pattern, texto)
        return {
            "categoria": nome,
            "quantidade": int(m.group(1).replace(".", "")) if m else 0,
            "participacao": float(m.group(2).replace(",", ".")) if m else 0.0,
        }

    categorias = [
        parse_categoria("Assentado PNRA"),
        parse_categoria("Benefício PNCF"),
        parse_categoria("Quilombo"),
        parse_categoria("Terra Indígena"),
        parse_categoria("Demais Povos e Comunidades Tradicionais"),
        parse_categoria("Nenhuma opção"),
    ]
    atividades = [
        parse_categoria("Aquicultor"),
        parse_categoria("Extrativista"),
        parse_categoria("Pescador Artesanal"),
        parse_categoria("Silvicultor"),
        parse_categoria("Demais Agricultores Familiares"),
    ]
    data_envio_composicao = buscar(r"data de envio do arquivo:\s*([\d/]+)")

    municipios_socios = []
    padrao_mun = re.compile(r"^(.+/[A-Z]{2})\s+(\d+)$", re.MULTILINE)
    for m in padrao_mun.finditer(texto):
        municipios_socios.append({"municipio": m.group(1).strip(), "quantidade": int(m.group(2))})

    return {
        "_cnpj_consultado": cnpj,
        "cnpj": re.sub(r"\D", "", cnpj_doc or cnpj),
        "numeroCaf": numero_caf,
        "razaoSocial": razao_social,
        "situacao": situacao,
        "tipoPessoaJuridica": tipo_pj,
        "municipio": municipio,
        "uf": uf,
        "dataInscricao": data_inscricao,
        "dataValidade": data_validade,
        "ultimaAtualizacao": ultima_atualizacao,
        "representanteLegal": representante,
        "masculino": masculino,
        "feminino": feminino,
        "totalComCaf": total_com_caf,
        "totalSemCaf": total_sem_caf,
        "percentualComCaf": percentual_com,
        "dataEnvioComposicao": data_envio_composicao,
        "categorias": categorias,
        "atividades": atividades,
        "municipiosSocios": municipios_socios,
    }


def _trunc(value, max_len: int):
    if value is None:
        return None
    s = str(value)
    return s[:max_len] if len(s) > max_len else s


def _composicao_societaria_sql(val) -> str | None:
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return json.dumps(val, ensure_ascii=False)
    if isinstance(val, str) and val.strip():
        return val.strip()
    return None


def _row_values(r: dict, coop_id, agora: datetime):
    cnpj14 = re.sub(r"\D", "", r.get("cnpj") or r.get("_cnpj_consultado", ""))
    return (
        coop_id,
        cnpj14,
        _trunc(r.get("caf_uuid"), 36),
        _trunc(r.get("numeroCaf"), 255),
        _trunc(r.get("razaoSocial"), 255),
        _trunc(r.get("situacao"), 50),
        _trunc(r.get("tipoPessoaJuridica"), 100),
        _trunc(r.get("municipio"), 100),
        _trunc(r.get("uf"), 2),
        _trunc(r.get("dataInscricao"), 50),
        _trunc(r.get("dataValidade"), 50),
        _trunc(r.get("ultimaAtualizacao"), 50),
        _trunc(r.get("representanteLegal"), 255),
        int(r.get("totalComCaf") or 0),
        int(r.get("totalSemCaf") or 0),
        float(r.get("percentualComCaf") or 0),
        int(r.get("masculino") or 0),
        int(r.get("feminino") or 0),
        _trunc(r.get("dataEnvioComposicao"), 20),
        json.dumps(r.get("categorias") or [], ensure_ascii=False),
        json.dumps(r.get("atividades") or [], ensure_ascii=False),
        json.dumps(r.get("municipiosSocios") or [], ensure_ascii=False),
        _composicao_societaria_sql(r.get("composicao_societaria")),
        agora,
    )


def _dedupe_caf_data(cur) -> int:
    cur.execute(
        """
        DELETE c1 FROM caf_data c1
        JOIN caf_data c2 ON c1.cnpj = c2.cnpj AND c1.id < c2.id
        """
    )
    return cur.rowcount or 0


def gravar_mysql(resultados: list, *, dedupe: bool = True) -> dict:
    import pymysql

    relatorio = {"inseridos": 0, "atualizados": 0, "falhas": [], "removidos_dedupe": 0}
    cfg = mysql_config()
    cfg["autocommit"] = False
    conn = pymysql.connect(**cfg)
    try:
        with conn.cursor() as cur:
            cur.execute("SHOW TABLES LIKE 'caf_data'")
            if not cur.fetchone():
                raise RuntimeError("Tabela caf_data não existe no banco.")

            if dedupe:
                removidos = _dedupe_caf_data(cur)
                relatorio["removidos_dedupe"] = removidos
                if removidos:
                    log(f"Dedupe: {removidos} linha(s) duplicada(s) removida(s).", "warn")
                conn.commit()

            sets_sql = ", ".join(f"`{c}` = %s" for c in CAF_COLS)
            cols_sql = ", ".join(f"`{c}`" for c in CAF_COLS)
            placeholders_sql = ", ".join(["%s"] * len(CAF_COLS))
            update_sql = f"UPDATE caf_data SET {sets_sql} WHERE id = %s"
            insert_sql = f"INSERT INTO caf_data ({cols_sql}) VALUES ({placeholders_sql})"
            select_coop_sql = (
                "SELECT id FROM cooperative "
                "WHERE REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(cnpj,''),'.',''),'/',''),'-',''),' ','') = %s "
                "LIMIT 1"
            )
            agora = datetime.now()

            for r in resultados:
                cnpj14 = re.sub(r"\D", "", r.get("cnpj") or r.get("_cnpj_consultado", ""))
                if not cnpj14:
                    relatorio["falhas"].append(("(sem cnpj)", "CNPJ vazio"))
                    continue
                try:
                    cur.execute(select_coop_sql, (cnpj14,))
                    row = cur.fetchone()
                    coop_id = int(row[0]) if row else None
                    cur.execute("SELECT id FROM caf_data WHERE cnpj = %s ORDER BY id DESC LIMIT 1", (cnpj14,))
                    existing = cur.fetchone()
                    vals = _row_values(r, coop_id, agora)
                    if existing:
                        cur.execute(update_sql, (*vals, existing[0]))
                        relatorio["atualizados"] += 1
                    else:
                        cur.execute(insert_sql, vals)
                        relatorio["inseridos"] += 1
                except Exception as e:
                    conn.rollback()
                    relatorio["falhas"].append((cnpj14, f"{type(e).__name__}: {e}"))
                    continue
            conn.commit()
    finally:
        conn.close()
    return relatorio


def carregar_cnpjs_cooperative() -> list[tuple[int, str]]:
    import pymysql

    cfg = mysql_config()
    sql = (
        "SELECT id, cnpj FROM cooperative "
        "WHERE cnpj IS NOT NULL AND TRIM(cnpj) <> '' ORDER BY id"
    )
    conn = pymysql.connect(**cfg)
    try:
        out: list[tuple[int, str]] = []
        with conn.cursor() as cur:
            cur.execute(sql)
            for coop_id, cnpj_raw in cur.fetchall():
                c14 = re.sub(r"\D", "", str(cnpj_raw or ""))
                if len(c14) == 14:
                    out.append((int(coop_id), c14))
        return out
    finally:
        conn.close()


def _cnpj14_val(raw: str) -> str:
    return re.sub(r"\D", "", str(raw or ""))


def carregar_cafe_uuid_map() -> dict[str, str | None]:
    """Retorna mapa cnpj14 → cafe_uuid já gravado em caf_data."""
    import pymysql

    cfg = mysql_config()
    sql = "SELECT cnpj, cafe_uuid FROM caf_data WHERE cnpj IS NOT NULL AND TRIM(cnpj) <> ''"
    conn = pymysql.connect(**cfg)
    try:
        out: dict[str, str | None] = {}
        with conn.cursor() as cur:
            cur.execute(sql)
            for cnpj_raw, uuid_raw in cur.fetchall():
                c14 = _cnpj14_val(cnpj_raw)
                if len(c14) != 14:
                    continue
                uuid = str(uuid_raw).strip() if uuid_raw else None
                out[c14] = uuid or None
        return out
    finally:
        conn.close()


def sincronizar_cafe_uuids(
    cnpjs_alvo: list[str],
    merged: dict,
    coop_rows: list[tuple[int, str]],
) -> dict:
    """
    Para cada CNPJ: compara UUID da API CAF com caf_data.cafe_uuid.
    - Igual → não altera
    - Diferente → UPDATE cafe_uuid
    - Sem linha em caf_data → INSERT mínimo (cnpj + cafe_uuid + cooperative_id)
    """
    import pymysql

    coop_by_cnpj = {cnpj: coop_id for coop_id, cnpj in coop_rows}
    uuid_db = carregar_cafe_uuid_map()

    api_by_cnpj: dict[str, str] = {}
    for item in merged.get("resultados", []):
        if not isinstance(item, dict):
            continue
        c14 = _cnpj14_val(item.get("_cnpj_consultado") or item.get("cnpj") or "")
        api_id = str(item.get("id") or "").strip()
        if len(c14) == 14 and api_id:
            api_by_cnpj[c14] = api_id

    stats = {
        "uuidIguais": 0,
        "uuidAtualizados": 0,
        "uuidInseridos": 0,
        "semUuidApi": 0,
    }

    cfg = mysql_config()
    cfg["autocommit"] = False
    conn = pymysql.connect(**cfg)
    agora = datetime.now()

    select_id_sql = "SELECT id, cafe_uuid FROM caf_data WHERE cnpj = %s LIMIT 1"
    update_uuid_sql = "UPDATE caf_data SET cafe_uuid = %s, consulted_at = %s WHERE id = %s"
    insert_uuid_sql = (
        "INSERT INTO caf_data ("
        "cooperative_id, cnpj, cafe_uuid, total_com_caf, total_sem_caf, "
        "percentual_com_caf, masculino, feminino, consulted_at, created_at"
        ") VALUES (%s, %s, %s, 0, 0, 0, 0, 0, %s, %s)"
    )

    try:
        with conn.cursor() as cur:
            cur.execute("SHOW TABLES LIKE 'caf_data'")
            if not cur.fetchone():
                raise RuntimeError("Tabela caf_data não existe no banco.")

            total = len(cnpjs_alvo)
            for i, cnpj in enumerate(cnpjs_alvo, 1):
                progress(i, total, f"Validando UUID {cnpj}")
                api_uuid = api_by_cnpj.get(cnpj)
                if not api_uuid:
                    stats["semUuidApi"] += 1
                    continue

                db_uuid = (uuid_db.get(cnpj) or "").strip() or None
                if db_uuid == api_uuid:
                    stats["uuidIguais"] += 1
                    log(f"CNPJ {cnpj}: UUID já correto — pulando atualização.", "info")
                    continue

                cur.execute(select_id_sql, (cnpj,))
                row = cur.fetchone()
                if row:
                    row_id, old_uuid = row[0], (str(row[1]).strip() if row[1] else None)
                    cur.execute(update_uuid_sql, (api_uuid, agora, row_id))
                    stats["uuidAtualizados"] += 1
                    old_short = (old_uuid or "—")[:8]
                    log(
                        f"CNPJ {cnpj}: UUID atualizado {old_short}… → {api_uuid[:8]}…",
                        "warn",
                    )
                else:
                    coop_id = coop_by_cnpj.get(cnpj)
                    cur.execute(insert_uuid_sql, (coop_id, cnpj, api_uuid, agora, agora))
                    stats["uuidInseridos"] += 1
                    log(f"CNPJ {cnpj}: UUID gravado ({api_uuid[:8]}…) — novo registro.", "success")

            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    log(
        f"UUIDs: {stats['uuidIguais']} já corretos, {stats['uuidAtualizados']} atualizados, "
        f"{stats['uuidInseridos']} inseridos, {stats['semUuidApi']} sem ID na API.",
        "info",
    )
    return stats
