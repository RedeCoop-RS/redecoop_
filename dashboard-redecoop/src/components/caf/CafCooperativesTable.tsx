import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Info, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { cafRowKey, formatCnpj } from '@/lib/caf'
import type { CafCooperativa } from '@/types'

function DetailTable({
  title,
  rows,
  emptyText,
}: {
  title: string
  rows: { categoria: string; quantidade: number; participacao: number }[]
  emptyText: string
}) {
  if (!rows.length) {
    return (
      <div className="caf-detail-block">
        <p className="caf-detail__subtitle">{title}</p>
        <p className="caf-detail__empty">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="caf-detail-block">
      <p className="caf-detail__subtitle">{title}</p>
      <div className="caf-detail-table-wrap">
        <table className="caf-scroll-table data-table data-table--compact">
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="caf-scroll-table__num">Qtd</th>
              <th className="caf-scroll-table__num">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.categoria}-${row.quantidade}`}>
                <td>{row.categoria}</td>
                <td className="caf-scroll-table__num">{row.quantidade.toLocaleString('pt-BR')}</td>
                <td className="caf-scroll-table__num">
                  {row.participacao.toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2,
                  })}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function matchesSearch(item: CafCooperativa, query: string) {
  const q = query.toLowerCase().trim()
  if (!q) return true
  const cnpj = (item.cnpj ?? '').replace(/\D/g, '')
  const qDigits = q.replace(/\D/g, '')
  return (
    (item.fantasyName ?? '').toLowerCase().includes(q) ||
    (item.situacao ?? '').toLowerCase().includes(q) ||
    (qDigits.length > 0 && cnpj.includes(qDigits))
  )
}

export function CafCooperativesTable({ cooperativas }: { cooperativas: CafCooperativa[] }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => cooperativas.filter((c) => matchesSearch(c, search)),
    [cooperativas, search],
  )

  const toggle = (item: CafCooperativa) => {
    const key = cafRowKey(item)
    setExpandedKey((current) => (current === key ? null : key))
  }

  return (
    <div className="caf-panel-card panel-card">
      <div className="caf-panel-card__header panel-card__header">
        <div>
          <p className="caf-panel-card__title">Detalhes por Cooperativa</p>
          <p className="caf-panel-card__subtitle">
            Clique em uma linha para expandir categorias, atividades e municípios
          </p>
        </div>
        <div className="caf-panel-card__actions">
          <div className="caf-panel-card__search">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
            <Input
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="caf-panel-card__count">{filtered.length} cooperativas</span>
        </div>
      </div>

      <div className="caf-table-wrap">
        <table className="caf-table">
          <thead>
            <tr>
              <th className="caf-table__col-name">Nome Fantasia</th>
              <th className="caf-table__col-cnpj">CNPJ</th>
              <th className="caf-table__col-sit">Situação</th>
              <th className="caf-table__col-date">Validade</th>
              <th className="caf-table__col-num">Com</th>
              <th className="caf-table__col-num">Sem</th>
              <th className="caf-table__col-num">%</th>
              <th className="caf-table__col-num">M</th>
              <th className="caf-table__col-num">F</th>
              <th className="caf-table__col-toggle" aria-label="Expandir" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, index) => {
              const key = cafRowKey(c)
              const expanded = expandedKey === key
              const ativo = (c.situacao || '').toUpperCase() === 'ATIVO'

              return (
                <Fragment key={key}>
                  <tr
                    className={`caf-table__row${index % 2 === 1 ? ' caf-table__row--alt' : ''}${expanded ? ' caf-table__row--expanded' : ''}`}
                    onClick={() => toggle(c)}
                  >
                    <td className="caf-table__col-name" title={c.fantasyName ?? ''}>
                      <span className="caf-table__name">{c.fantasyName || '—'}</span>
                    </td>
                    <td className="caf-table__col-cnpj">
                      <code className="caf-table__cnpj">{formatCnpj(c.cnpj)}</code>
                    </td>
                    <td className="caf-table__col-sit">
                      <span className={`badge ${ativo ? 'badge--green' : 'badge--red'}`}>
                        {c.situacao || '—'}
                      </span>
                    </td>
                    <td className="caf-table__col-date">{c.dataValidade || '—'}</td>
                    <td className="caf-table__col-num">{c.totalComCaf.toLocaleString('pt-BR')}</td>
                    <td className="caf-table__col-num">{c.totalSemCaf.toLocaleString('pt-BR')}</td>
                    <td className="caf-table__col-num caf-table__pct">
                      {c.percentualComCaf.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                      %
                    </td>
                    <td className="caf-table__col-num">{c.masculino.toLocaleString('pt-BR')}</td>
                    <td className="caf-table__col-num">{c.feminino.toLocaleString('pt-BR')}</td>
                    <td className="caf-table__col-toggle">
                      <span className={`caf-table__chevron${expanded ? ' caf-table__chevron--open' : ''}`}>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </span>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="caf-table__detail">
                      <td colSpan={10}>
                        <div className="caf-detail-panel">
                          <div className="caf-detail-panel__hint">
                            <Info size={14} />
                            Detalhes do extrato CAF
                          </div>
                          <div className="caf-detail-panel__grid">
                            <DetailTable
                              title={
                                c.dataEnvioComposicao
                                  ? `Categorias dos Agricultores Familiares (envio: ${c.dataEnvioComposicao})`
                                  : 'Categorias dos Agricultores Familiares'
                              }
                              rows={c.categorias ?? []}
                              emptyText="Sem dados de categorias."
                            />
                            <DetailTable
                              title="Atividade Principal"
                              rows={c.atividades ?? []}
                              emptyText="Sem dados de atividades."
                            />
                            <div className="caf-detail-block caf-detail-block--full">
                              <p className="caf-detail__subtitle">Sócios por Município</p>
                              {(c.municipiosSocios ?? []).length > 0 ? (
                                <div className="caf-detail__tags">
                                  {(c.municipiosSocios ?? []).map((m) => (
                                    <span key={m.municipio} className="caf-detail__tag">
                                      {m.municipio}: <strong>{m.quantidade}</strong>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="caf-detail__empty">Sem distribuição por município.</p>
                              )}
                            </div>
                            <div className="caf-detail-block caf-detail-block--full caf-detail__meta">
                              <span>
                                Nº CAF: <strong>{c.numeroCaf || '—'}</strong>
                              </span>
                              <span>
                                Sede: <strong>{c.municipio || '—'}/{c.uf || '—'}</strong>
                              </span>
                              <span>
                                Tipo: <strong>{c.tipoPessoaJuridica || '—'}</strong>
                              </span>
                              <span>
                                Inscrição: <strong>{c.dataInscricao || '—'}</strong>
                              </span>
                              <span>
                                Atualização: <strong>{c.ultimaAtualizacao || '—'}</strong>
                              </span>
                              <span>
                                Representante: <strong>{c.representanteLegal || '—'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
