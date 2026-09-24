import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cooperative } from '../cooperative/entities/cooperative.entity';
import { CooperativeType } from '../cooperative/enums/cooperativeType.enum';
import { CafData } from './entities/caf-data.entity';

/** Só na visão admin “todas as cooperativas”: centrais não entram nos totais (evita dupla contagem). Com `cooperativeId` (filtro admin ou cooperativa logada), usa-se o extrato daquela cooperativa, central ou singular. */
function isCafRowForAggregateTotals(
  row: CafData,
  typeByCoopId: Map<number, CooperativeType>,
): boolean {
  const id = row.cooperativeId;
  if (id == null || id <= 0) return true;
  const t = typeByCoopId.get(id);
  if (t === undefined) return true;
  return t !== CooperativeType.CENTRAL;
}

function parseJsonField<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return null;
    }
  }
  return v as T;
}

function normLabel(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toUpperCase();
}

function agregarMunicipiosSocios(data: CafData[]): CafAgregadoMunicipio[] {
  const acc = new Map<string, { label: string; q: number }>();
  for (const d of data) {
    const arr =
      parseJsonField<Array<{ municipio?: string; quantidade?: unknown }>>(d.municipiosSocios) ?? [];
    for (const row of arr) {
      const label = (row.municipio ?? '').trim();
      if (!label) continue;
      const key = normLabel(label);
      const q = Number(row.quantidade ?? 0);
      const add = Number.isFinite(q) ? q : 0;
      const cur = acc.get(key);
      if (cur) acc.set(key, { label: cur.label, q: cur.q + add });
      else acc.set(key, { label, q: add });
    }
  }
  return [...acc.values()]
    .map(({ label, q }) => ({ municipio: label, quantidade: q }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

function agregarCategoriasOuAtividades(
  data: CafData[],
  field: 'categorias' | 'atividades',
  origem: 'categoria' | 'atividade',
): CafAgregadoPublicoAtividade[] {
  const acc = new Map<string, { nome: string; q: number }>();
  for (const d of data) {
    const arr =
      parseJsonField<Array<{ categoria?: string; quantidade?: unknown }>>(d[field]) ?? [];
    for (const row of arr) {
      const nome = (row.categoria ?? '').trim();
      if (!nome) continue;
      const key = normLabel(nome);
      const q = Number(row.quantidade ?? 0);
      const add = Number.isFinite(q) ? q : 0;
      const cur = acc.get(key);
      if (cur) acc.set(key, { nome: cur.nome, q: cur.q + add });
      else acc.set(key, { nome, q: add });
    }
  }
  return [...acc.values()]
    .map(({ nome, q }) => ({ nome, origem, quantidade: q }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

function agregarPublicoEAtividade(data: CafData[]): CafAgregadoPublicoAtividade[] {
  const cats = agregarCategoriasOuAtividades(data, 'categorias', 'categoria');
  const ativ = agregarCategoriasOuAtividades(data, 'atividades', 'atividade');
  return [...cats, ...ativ].sort((a, b) => b.quantidade - a.quantidade);
}

export type CafAgregadoMunicipio = { municipio: string; quantidade: number };

export type CafAgregadoPublicoAtividade = {
  nome: string;
  /** `categoria` = bloco “categorias” do PDF CAF; `atividade` = bloco atividades principais. */
  origem: 'categoria' | 'atividade';
  quantidade: number;
};

export type CafPanelPayload = {
  totalMasculino: number;
  totalFeminino: number;
  totalComCaf: number;
  totalSemCaf: number;
  cooperativasAtivas: number;
  cooperativasInativas: number;
  totalNaListaRedecoop: number;
  comExtratoNoBanco: number;
  semExtratoNaLista: number;
  cnpjsSemExtrato: string[];
  lastUpdate: Date | null;
  cooperativas: Record<string, unknown>[];
  maioresPorTotalSocios: { label: string; total: number }[];
  /** Soma dos quadros “Sócios por município” de cada extrato (pode sobrepor pessoas em mais de uma cooperativa). */
  sociosPorMunicipioAgregado: CafAgregadoMunicipio[];
  /** Soma das categorias de público + atividades principais dos extratos. */
  sociosPorPublicoEAtividadeAgregado: CafAgregadoPublicoAtividade[];
};

function normalizeCnpj(cnpj?: string | null): string {
  return (cnpj ?? '').replace(/\D/g, '');
}

@Injectable()
export class CafService {
  constructor(
    @InjectRepository(CafData) private readonly cafRepo: Repository<CafData>,
    @InjectRepository(Cooperative) private readonly cooperativeRepo: Repository<Cooperative>,
  ) {}

  private entityToPlain(entity: CafData): Record<string, unknown> {
    return {
      id: entity.id,
      cooperativeId: entity.cooperativeId,
      cnpj: entity.cnpj,
      cafUuid: entity.cafUuid,
      numeroCaf: entity.numeroCaf,
      razaoSocial: entity.razaoSocial,
      situacao: entity.situacao,
      tipoPessoaJuridica: entity.tipoPessoaJuridica,
      municipio: entity.municipio,
      uf: entity.uf,
      dataInscricao: entity.dataInscricao,
      dataValidade: entity.dataValidade,
      ultimaAtualizacao: entity.ultimaAtualizacao,
      representanteLegal: entity.representanteLegal,
      totalComCaf: entity.totalComCaf,
      totalSemCaf: entity.totalSemCaf,
      percentualComCaf: Number(entity.percentualComCaf),
      masculino: entity.masculino,
      feminino: entity.feminino,
      dataEnvioComposicao: entity.dataEnvioComposicao,
      categorias: parseJsonField<unknown[]>(entity.categorias) ?? [],
      atividades: parseJsonField<unknown[]>(entity.atividades) ?? [],
      municipiosSocios: parseJsonField<unknown[]>(entity.municipiosSocios) ?? [],
      composicaoSocietaria: parseJsonField<unknown>(entity.composicaoSocietaria),
      consultedAt: entity.consultedAt,
      createdAt: entity.createdAt,
    };
  }

  async getPanel(cooperativeId?: number): Promise<CafPanelPayload> {
    const query = this.cafRepo.createQueryBuilder('caf');
    if (cooperativeId) {
      query.where('caf.cooperative_id = :cooperativeId', { cooperativeId });
    }
    const data = await query.getMany();

    const listaQuery = this.cooperativeRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.cnpj', 'c.type', 'c.active', 'c.fantasyName']);
    if (cooperativeId) {
      listaQuery.where('c.id = :cooperativeId', { cooperativeId });
    } else {
      listaQuery.where('c.active = :active', { active: true });
    }
    const listaRedecoop = await listaQuery.getMany();

    const cooperativeIds = [
      ...new Set(
        [
          ...data.map((d) => d.cooperativeId),
          ...listaRedecoop.map((c) => c.id),
        ].filter((id): id is number => id != null && id > 0),
      ),
    ];
    const fantasyByCoopId = new Map<number, string | null>();
    const typeByCoopId = new Map<number, CooperativeType>();
    if (cooperativeIds.length) {
      const coops = await this.cooperativeRepo.find({
        where: { id: In(cooperativeIds) },
        select: ['id', 'fantasyName', 'type'],
      });
      for (const c of coops) {
        fantasyByCoopId.set(c.id, c.fantasyName ?? null);
        typeByCoopId.set(c.id, c.type);
      }
    }

    const cafByCoopId = new Set(
      data.map((d) => d.cooperativeId).filter((id): id is number => id != null && id > 0),
    );
    const cafByCnpj = new Set(
      data.map((d) => normalizeCnpj(d.cnpj)).filter((cnpj) => cnpj.length > 0),
    );

    const semExtrato = listaRedecoop.filter((c) => {
      if (cafByCoopId.has(c.id)) return false;
      const cnpj = normalizeCnpj(c.cnpj);
      if (cnpj && cafByCnpj.has(cnpj)) return false;
      return true;
    });
    const cnpjsSemExtrato = [
      ...new Set(
        semExtrato
          .map((c) => normalizeCnpj(c.cnpj))
          .filter((cnpj) => cnpj.length > 0),
      ),
    ];

    const aggData =
      cooperativeId != null
        ? data
        : data.filter((d) => isCafRowForAggregateTotals(d, typeByCoopId));

    const totalMasculino = aggData.reduce((acc, d) => acc + (d.masculino || 0), 0);
    const totalFeminino = aggData.reduce((acc, d) => acc + (d.feminino || 0), 0);
    const totalComCaf = aggData.reduce((acc, d) => acc + (d.totalComCaf || 0), 0);
    const totalSemCaf = aggData.reduce((acc, d) => acc + (d.totalSemCaf || 0), 0);
    const ativas = data.filter((d) => (d.situacao || '').toUpperCase() === 'ATIVO').length;
    const inativas = data.filter((d) => (d.situacao || '').toUpperCase() !== 'ATIVO').length;
    const lastUpdate = data.reduce((latest, d) => {
      return d.consultedAt > latest ? d.consultedAt : latest;
    }, new Date(0));

    const maioresPorTotalSocios = [...aggData]
      .map((d) => {
        const raw =
          d.cooperativeId != null ? fantasyByCoopId.get(d.cooperativeId) : null;
        const nome = (raw ?? '').trim();
        const curto = nome.length > 32 ? `${nome.slice(0, 30)}…` : nome || '—';
        return {
          label: curto,
          total: (d.totalComCaf || 0) + (d.totalSemCaf || 0),
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const payload: CafPanelPayload = {
      totalMasculino,
      totalFeminino,
      totalComCaf,
      totalSemCaf,
      cooperativasAtivas: ativas,
      cooperativasInativas: inativas,
      totalNaListaRedecoop: listaRedecoop.length,
      comExtratoNoBanco: listaRedecoop.length - semExtrato.length,
      semExtratoNaLista: semExtrato.length,
      cnpjsSemExtrato,
      lastUpdate: lastUpdate > new Date(0) ? lastUpdate : null,
      cooperativas: data.map((d) => ({
        ...this.entityToPlain(d),
        fantasyName:
          d.cooperativeId != null ? fantasyByCoopId.get(d.cooperativeId) ?? null : null,
      })),
      maioresPorTotalSocios,
      sociosPorMunicipioAgregado: agregarMunicipiosSocios(aggData),
      sociosPorPublicoEAtividadeAgregado: agregarPublicoEAtividade(aggData),
    };
    // Objeto 100% JSON-serializável — evita o ClassSerializerInterceptor “sumir” com subestruturas.
    return JSON.parse(JSON.stringify(payload)) as CafPanelPayload;
  }
}

