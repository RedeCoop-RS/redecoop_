"""
Pipeline unificado CAF REDECOOP
===============================
1. Captura token (hCaptcha — interação humana)
2. buscar_ids → UUID por CNPJ na API CAF
3. Valida cafe_uuid em caf_data (atualiza se incorreto; ignora se já correto)
4. Extratos PDF (Singular + Central) + composição societária
5. UPSERT completo em caf_data (MySQL)

Eventos JSON em stdout para o NestJS.
"""
from __future__ import annotations

import argparse
import asyncio
import sys

from buscar_ids import buscar_ids
from consulta_caf_core import (
    capturar_token,
    carregar_cnpjs_cooperative,
    gravar_mysql,
    sincronizar_cafe_uuids,
)
from emit import done, fail, log, phase
from extrato_pipeline import (
    analisar_duplicatas,
    carregar_cooperativas_alvo,
    consultar_extratos,
    mesclar_composicao_societaria,
)


async def run(*, workers: int = 6, dedupe: bool = True) -> None:
    phase("init", "Iniciando sincronização CAF REDECOOP…")
    rows = carregar_cnpjs_cooperative()
    cnpjs = list(dict.fromkeys(cnpj for _, cnpj in rows))
    if not cnpjs:
        fail("Nenhum CNPJ encontrado na tabela cooperative.")
    log(f"{len(cnpjs)} CNPJ(s) carregados do banco.", "info")

    proof, ua = await capturar_token()
    token_holder = [proof, ua]

    merged, json_path, sem_id = await buscar_ids(cnpjs, captcha_proof=proof, user_agent=ua)
    if sem_id:
        log(f"{len(sem_id)} CNPJ(s) sem UUID na API CAF.", "warn")

    phase("uuid_sync", "Validando cafe_uuid no banco (caf_data)…")
    uuid_stats = sincronizar_cafe_uuids(cnpjs, merged, rows)

    alvos = carregar_cooperativas_alvo(merged)
    if not alvos:
        fail("Nenhuma cooperativa Singular/Central com UUID no JSON. Verifique os tipos no CAF.")

    extratos, erros_extrato, dup_aux = await consultar_extratos(token_holder, alvos, workers=workers)
    analise = analisar_duplicatas(dup_aux)
    mesclar_composicao_societaria(extratos, dup_aux, analise)

    inactive = [
        {
            "cnpj": e.get("cnpj") or e.get("_cnpj_consultado"),
            "razaoSocial": e.get("razaoSocial") or "",
            "situacao": e.get("situacao") or "—",
        }
        for e in extratos
        if (e.get("situacao") or "").upper() != "ATIVO"
    ]

    phase("mysql", f"Gravando {len(extratos)} extrato(s) no MySQL…")
    from emit import progress as emit_progress
    emit_progress(0, 1, "Gravando extratos no banco…")
    rel = {"inseridos": 0, "atualizados": 0, "falhas": []}
    if extratos:
        rel = gravar_mysql(extratos, dedupe=dedupe)
        emit_progress(1, 1, "Gravação concluída")
        log(
            f"MySQL: {rel['inseridos']} inserido(s), {rel['atualizados']} atualizado(s), "
            f"{len(rel['falhas'])} falha(s).",
            "success" if not rel["falhas"] else "warn",
        )

    done(
        idsTotal=len(cnpjs),
        idsFound=len(cnpjs) - len(sem_id),
        idsMissing=len(sem_id),
        idsMissingList=sem_id[:50],
        jsonPath=json_path,
        uuidIguais=uuid_stats.get("uuidIguais", 0),
        uuidAtualizados=uuid_stats.get("uuidAtualizados", 0),
        uuidInseridos=uuid_stats.get("uuidInseridos", 0),
        semUuidApi=uuid_stats.get("semUuidApi", 0),
        extratosOk=len(extratos),
        extratosFailed=len(erros_extrato),
        extratosFailedList=erros_extrato[:50],
        mysqlInserted=rel.get("inseridos", 0),
        mysqlUpdated=rel.get("atualizados", 0),
        mysqlFailures=len(rel.get("falhas", [])),
        inactive=inactive,
        duplicadosCaf=len(analise.get("duplicados", {})),
    )


def main():
    p = argparse.ArgumentParser(description="Pipeline CAF unificado REDECOOP")
    p.add_argument("--workers", type=int, default=6, help="Cooperativas em paralelo (padrão 6)")
    p.add_argument("--no-dedupe", action="store_true", help="Não deduplicar caf_data antes do upsert")
    args = p.parse_args()
    try:
        asyncio.run(run(workers=max(1, args.workers), dedupe=not args.no_dedupe))
    except KeyboardInterrupt:
        fail("Cancelado pelo usuário.")
    except Exception as e:
        fail(f"{type(e).__name__}: {e}")


if __name__ == "__main__":
    main()
