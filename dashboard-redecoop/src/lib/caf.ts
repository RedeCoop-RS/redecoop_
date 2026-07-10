import type { CafCategoria, CafCooperativa, CafMunicipio } from '@/types'

export function formatCnpj(raw: string | null | undefined): string {
  const d = (raw || '').replace(/\D/g, '')
  if (d.length !== 14) return raw || '—'
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function formatCnpjsList(list: string[] | undefined): string {
  return (list ?? []).map((c) => formatCnpj(c)).join(' · ')
}

export function labelOrigemClassificacao(origem: 'categoria' | 'atividade'): string {
  return origem === 'categoria' ? 'Categoria (público)' : 'Atividade principal'
}

export function formatLastUpdate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function jsonArray<T>(v: unknown): T[] {
  if (v == null) return []
  if (Array.isArray(v)) return v as T[]
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)
      return Array.isArray(p) ? (p as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

export function normalizeCafCooperativa(row: CafCooperativa | Record<string, unknown>): CafCooperativa {
  const r = row as Record<string, unknown>
  const pickStr = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = r[k]
      if (v != null && String(v).trim() !== '') return String(v)
    }
    return null
  }
  const pickNum = (...keys: string[]): number => {
    for (const k of keys) {
      const v = r[k]
      if (v != null && v !== '') {
        const n = Number(v)
        if (!Number.isNaN(n)) return n
      }
    }
    return 0
  }

  return {
    id: pickNum('id'),
    cooperativeId: pickNum('cooperativeId', 'cooperative_id'),
    cnpj: String(pickStr('cnpj') ?? ''),
    cafUuid: pickStr('cafUuid', 'caf_uuid', 'cafeUuid', 'cafe_uuid'),
    numeroCaf: pickStr('numeroCaf', 'numero_caf'),
    fantasyName: pickStr('fantasyName', 'fantasy_name'),
    razaoSocial: pickStr('razaoSocial', 'razao_social'),
    situacao: pickStr('situacao'),
    tipoPessoaJuridica: pickStr('tipoPessoaJuridica', 'tipo_pessoa_juridica'),
    municipio: pickStr('municipio'),
    uf: pickStr('uf'),
    dataInscricao: pickStr('dataInscricao', 'data_inscricao'),
    dataValidade: pickStr('dataValidade', 'data_validade'),
    ultimaAtualizacao: pickStr('ultimaAtualizacao', 'ultima_atualizacao'),
    representanteLegal: pickStr('representanteLegal', 'representante_legal'),
    totalComCaf: pickNum('totalComCaf', 'total_com_caf'),
    totalSemCaf: pickNum('totalSemCaf', 'total_sem_caf'),
    percentualComCaf: pickNum('percentualComCaf', 'percentual_com_caf'),
    masculino: pickNum('masculino'),
    feminino: pickNum('feminino'),
    dataEnvioComposicao: pickStr('dataEnvioComposicao', 'data_envio_composicao'),
    categorias: jsonArray<CafCategoria>(r.categorias ?? r.categorias_json),
    atividades: jsonArray<CafCategoria>(r.atividades ?? r.atividades_json),
    municipiosSocios: jsonArray<CafMunicipio>(r.municipiosSocios ?? r.municipios_socios),
    consultedAt: String(r.consultedAt ?? r.consulted_at ?? ''),
  }
}

export function cafRowKey(item: CafCooperativa): string {
  return item.id ? `id:${item.id}` : `cnpj:${item.cnpj || ''}`
}
