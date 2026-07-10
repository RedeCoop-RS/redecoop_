import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, Percent, RefreshCw, Users } from 'lucide-react'
import { CafCooperativesTable } from '@/components/caf/CafCooperativesTable'
import { CafScrollTable } from '@/components/caf/CafScrollTable'
import { CafSyncModal } from '@/components/caf/CafSyncModal'
import { ChartCard } from '@/components/charts/ChartCard'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/contexts/AuthContext'
import { cafService } from '@/services/misc.service'
import {
  formatCnpjsList,
  labelOrigemClassificacao,
  normalizeCafCooperativa,
} from '@/lib/caf'
import type { CafPanelData, GraphData } from '@/types'

export function CafPanelPage() {
  const { user, isAdmin } = useAuth()
  const [panel, setPanel] = useState<CafPanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncOpen, setSyncOpen] = useState(false)

  const loadPanel = useCallback(() => {
    setLoading(true)
    cafService
      .getPanel()
      .then((raw) => {
        const cooperativas = (raw.cooperativas ?? []).map((row) =>
          normalizeCafCooperativa(row as Parameters<typeof normalizeCafCooperativa>[0]),
        )
        setPanel({ ...raw, cooperativas })
      })
      .catch(() => setPanel(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadPanel()
  }, [loadPanel])

  const nomeCooperativa =
    (user?.cooperative?.fantasyName ?? user?.cooperative?.name ?? user?.cooperative?.companyName ?? '')
      .trim() || 'Sua cooperativa'

  const totalSocios = (panel?.totalComCaf ?? 0) + (panel?.totalSemCaf ?? 0)
  const percentualComCaf =
    totalSocios > 0 ? ((panel!.totalComCaf! / totalSocios) * 100).toFixed(1) : '0'

  const charts = useMemo(() => {
    const sexo: GraphData = {
      categories: ['Masculino', 'Feminino'],
      data: [
        { name: 'Masculino', y: panel?.totalMasculino ?? 0 },
        { name: 'Feminino', y: panel?.totalFeminino ?? 0 },
      ],
    }

    const caf: GraphData = {
      categories: ['Com CAF ativo', 'Sem CAF'],
      data: [
        { name: 'Com CAF ativo', y: panel?.totalComCaf ?? 0 },
        { name: 'Sem CAF', y: panel?.totalSemCaf ?? 0 },
      ],
    }

    const maiores = panel?.maioresPorTotalSocios ?? []
    const sociosBar: GraphData = {
      categories: maiores.map((x) => x.label),
      data: maiores.map((x) => x.total),
    }

    return { sexo, caf, sociosBar }
  }, [panel])

  const hasAggregates =
    (panel?.sociosPorMunicipioAgregado?.length ?? 0) > 0 ||
    (panel?.sociosPorPublicoEAtividadeAgregado?.length ?? 0) > 0

  const showCnpjWarning =
    isAdmin && (panel?.cnpjsSemExtrato?.length ?? 0) > 0

  const isEmpty =
    !loading && (!panel || !(panel.cooperativas?.length ?? 0))

  const headerDescription = !isAdmin
    ? `Dados apenas da ${nomeCooperativa}.`
    : isEmpty
      ? 'Nenhum dado no banco ainda. Rode o script consulta_caf.py (mensal) para importar os extratos.'
      : undefined

  return (
    <div>
      <PageHeader
        kicker="CAF"
        title="Painel CAF"
        description={headerDescription}
        actions={
          isAdmin ? (
            <Button onClick={() => setSyncOpen(true)}>
              <RefreshCw size={16} />
              Atualizar CAFs
            </Button>
          ) : undefined
        }
      />

      <CafSyncModal
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        onComplete={loadPanel}
      />

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="loading-spinner" />
          <p className="mt-4 text-sm text-grey">Carregando dados...</p>
        </div>
      )}

      {!loading && isEmpty && (
        <EmptyState
          title="Nenhum dado disponível"
          description="Rode o script consulta_caf.py para gravar os extratos no banco."
          icon={<ClipboardList size={28} />}
        />
      )}

      {!loading && panel && !isEmpty && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <StatCard
              label="Cooperativas ativas (CAF)"
              value={panel.cooperativasAtivas ?? 0}
              icon={Users}
              variant="green"
            />
            <StatCard
              label="Total de sócios"
              value={totalSocios.toLocaleString('pt-BR')}
              icon={Users}
              trend="Soma dos extratos"
              variant="blue"
            />
            <StatCard
              label="Sócios com CAF ativo"
              value={`${percentualComCaf}%`}
              icon={Percent}
              trend={`${(panel.totalComCaf ?? 0).toLocaleString('pt-BR')} com CAF`}
              variant="yellow"
            />
          </div>

          {showCnpjWarning && (
            <div className="mb-6 rounded-xl border border-yellow/30 bg-yellow/10 px-4 py-3 text-sm text-ink">
              <strong>CNPJs da lista REDECOOP ainda sem registro no banco (sem PDF importado):</strong>
              <span className="mt-1 block font-mono text-xs text-grey-dark">
                {formatCnpjsList(panel.cnpjsSemExtrato)}
              </span>
            </div>
          )}

          <section className="caf-section">
            <h2 className="caf-section__title">Indicadores visuais</h2>
            <div className="grid gap-6 lg:grid-cols-3">
              <ChartCard title="Composição por sexo" data={charts.sexo} type="pie" />
              <ChartCard title="Sócios com / sem CAF" data={charts.caf} type="pie" />
              <ChartCard
                title="Maiores cooperativas (total de sócios)"
                data={charts.sociosBar}
                type="column"
              />
            </div>
          </section>

          {hasAggregates && (
            <section className="caf-section">
              <h2 className="caf-section__title">Resumo agregado</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                {(panel.sociosPorMunicipioAgregado?.length ?? 0) > 0 && (
                  <CafScrollTable
                    title="Sócios por município"
                    subtitle={
                      isAdmin
                        ? 'Soma de todas as cooperativas'
                        : 'Distribuição da sua cooperativa'
                    }
                    footer={
                      <span className="caf-panel-card__count">
                        {panel.sociosPorMunicipioAgregado!.length} municípios
                      </span>
                    }
                    columns={[
                      { key: 'municipio', label: 'Município' },
                      { key: 'quantidade', label: 'Quantidade', align: 'right', width: '110px' },
                    ]}
                  >
                    {panel.sociosPorMunicipioAgregado!.map((m, i) => (
                      <tr key={m.municipio} className={i % 2 === 1 ? 'caf-scroll-table__row--alt' : undefined}>
                        <td className="caf-scroll-table__label">{m.municipio}</td>
                        <td className="caf-scroll-table__num">{m.quantidade.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </CafScrollTable>
                )}

                {(panel.sociosPorPublicoEAtividadeAgregado?.length ?? 0) > 0 && (
                  <CafScrollTable
                    title="Público / atividade principal"
                    subtitle={
                      isAdmin
                        ? 'Soma de todas as cooperativas'
                        : 'Classificação da sua cooperativa'
                    }
                    footer={
                      <span className="caf-panel-card__count">
                        {panel.sociosPorPublicoEAtividadeAgregado!.length} itens
                      </span>
                    }
                    columns={[
                      { key: 'origem', label: 'Origem', width: '140px' },
                      { key: 'nome', label: 'Descrição' },
                      { key: 'quantidade', label: 'Quantidade', align: 'right', width: '110px' },
                    ]}
                  >
                    {panel.sociosPorPublicoEAtividadeAgregado!.map((p, i) => (
                      <tr key={`${p.origem}:${p.nome}`} className={i % 2 === 1 ? 'caf-scroll-table__row--alt' : undefined}>
                        <td>
                          <span
                            className={`caf-origem-badge caf-origem-badge--${p.origem === 'categoria' ? 'cat' : 'ativ'}`}
                          >
                            {labelOrigemClassificacao(p.origem)}
                          </span>
                        </td>
                        <td className="caf-scroll-table__label">{p.nome}</td>
                        <td className="caf-scroll-table__num">{p.quantidade.toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </CafScrollTable>
                )}
              </div>
            </section>
          )}

          {isAdmin && (panel.cooperativas?.length ?? 0) > 0 && (
            <section className="caf-section">
              <CafCooperativesTable cooperativas={panel.cooperativas!} />
            </section>
          )}
        </>
      )}
    </div>
  )
}
