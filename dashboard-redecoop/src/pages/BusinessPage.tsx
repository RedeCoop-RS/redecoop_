import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { DollarSign, Eye, MessageSquare, Search, Check } from 'lucide-react'
import { businessService, type BusinessListFilters } from '@/services/business.service'
import { BusinessChangeValueModal } from '@/components/modals/BusinessModals'
import { CooperativeDetailModal } from '@/components/modals/CooperativeModals'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { useBusinessView } from '@/contexts/BusinessViewContext'
import { useModal } from '@/contexts/ModalContext'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError } from '@/lib/api'
import {
  BUSINESS_MONTHS,
  BUSINESS_TYPE_LABELS,
  BUSINESS_YEARS,
  buildDateFilter,
  businessStatusClass,
  businessStatusLabel,
  businessUnreadCount,
  cooperativeBusinessLabel,
  formatBusinessDate,
  formatBusinessFee,
  getLastTravelStop,
} from '@/lib/business'
import { BusinessStatus, BusinessType, type Business } from '@/types'

const PAGE_SIZE = 12

function isUserOffering(business: Business, coopId?: number) {
  if (!coopId) return false
  return business.offeringCooperativeId === coopId || business.offeringCooperative?.id === coopId
}

function RowActions({
  row,
  admin,
  isCooperative,
  userCoopId,
  onChangeValue,
  onMarkDone,
  onView,
}: {
  row: Business
  admin: boolean
  isCooperative: boolean
  userCoopId?: number
  onChangeValue: () => void
  onMarkDone: () => void
  onView: () => void
}) {
  const canFinalize =
    row.status !== BusinessStatus.Done &&
    row.type !== BusinessType.V &&
    (!isCooperative || isUserOffering(row, userCoopId))
  const canChangeValue = admin && row.status !== BusinessStatus.Done && row.type === BusinessType.V

  return (
    <div className="business-actions">
      <button type="button" className="business-action-btn business-action-btn--view" onClick={onView}>
        <Eye size={14} />
        Ver
      </button>
      {canChangeValue && (
        <button type="button" className="business-action-btn business-action-btn--value" onClick={onChangeValue}>
          <DollarSign size={14} />
          Valor
        </button>
      )}
      {canFinalize && (
        <button type="button" className="business-action-btn business-action-btn--done" onClick={onMarkDone}>
          <Check size={14} />
          Finalizar
        </button>
      )}
    </div>
  )
}

function BusinessListPage({ admin }: { admin: boolean }) {
  const { confirm } = useModal()
  const { openBusinessView } = useBusinessView()
  const { user, isCooperative } = useAuth()
  const userCoopId = user?.cooperative?.id
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilterApplied = useRef(false)

  const [rows, setRows] = useState<Business[]>([])
  const [total, setTotal] = useState(0)
  const [negotiatingCount, setNegotiatingCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterOperation, setFilterOperation] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterNotMediation, setFilterNotMediation] = useState(false)
  const [appliedFilters, setAppliedFilters] = useState<BusinessListFilters>({})

  const [editBusiness, setEditBusiness] = useState<Business | null>(null)
  const [detailCoopId, setDetailCoopId] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = () => setReloadKey((k) => k + 1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = admin
        ? await businessService.listAdmin(page, PAGE_SIZE, appliedFilters)
        : await businessService.listCooperative(page, PAGE_SIZE, appliedFilters)
      setRows(result.data)
      setTotal(result.total)
      setNegotiatingCount(result.negotiatingCount)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao carregar negócios'
      toast.error(message)
      setRows([])
      setTotal(0)
      setNegotiatingCount(0)
    } finally {
      setLoading(false)
    }
  }, [admin, page, appliedFilters, reloadKey])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onBusinessChanged = () => reload()
    window.addEventListener('business:changed', onBusinessChanged)
    return () => window.removeEventListener('business:changed', onBusinessChanged)
  }, [])

  useEffect(() => {
    if (statusFilterApplied.current) return

    const status = searchParams.get('status')
    if (!status) return

    statusFilterApplied.current = true
    setFilterStatus(status)
    setAppliedFilters({ status })

    const next = new URLSearchParams(searchParams)
    next.delete('status')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const applyFilters = () => {
    setPage(1)
    setRows([])
    setAppliedFilters({
      status: filterStatus || undefined,
      type: filterType || undefined,
      operation: filterOperation || undefined,
      createdAtBetween: buildDateFilter(filterYear, filterMonth) || undefined,
      awaitingMediation: admin && filterNotMediation ? true : undefined,
    })
  }

  const unreadTotal = useMemo(
    () => rows.reduce((sum, row) => sum + businessUnreadCount(row), 0),
    [rows],
  )

  const colCount = admin ? 10 : 8

  const markDone = async (row: Business) => {
    const ok = await confirm({
      title: `Finalizar negociação #${row.id}`,
      message: 'Tem certeza de que deseja finalizar esse negócio? Esta ação é irreversível.',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await businessService.markAsDone(row.id)
      toast.success('Negócio finalizado!')
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  return (
    <div className="business-page">
      <PageHeader
        title={admin ? 'Negócios' : 'Meus negócios'}
        description="Negociações mediadas pela RedeCoop entre cooperativas."
      />

      <div className="business-filters">
        {!admin && (
          <Select
            label="Enviado/Recebido"
            value={filterOperation}
            onChange={(e) => setFilterOperation(e.target.value)}
            placeholder="Ambos"
            options={[
              { value: 'sended', label: 'Enviado' },
              { value: 'received', label: 'Recebido' },
            ]}
          />
        )}
        {!admin && (
          <Select
            label="Tipo"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            placeholder="Qualquer"
            options={Object.values(BusinessType).map((t) => ({
              value: t,
              label: BUSINESS_TYPE_LABELS[t as BusinessType] ?? t,
            }))}
          />
        )}
        <Select
          label="Status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          placeholder="Qualquer"
          options={Object.values(BusinessStatus).map((s) => ({
            value: s,
            label: businessStatusLabel(s),
          }))}
        />
        <Select
          label="Ano"
          value={filterYear}
          onChange={(e) => {
            setFilterYear(e.target.value)
            if (!e.target.value) setFilterMonth('')
          }}
          placeholder="Qualquer"
          options={BUSINESS_YEARS.map((y) => ({ value: y, label: y }))}
        />
        <Select
          label="Mês"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          placeholder="Qualquer"
          disabled={!filterYear}
          options={BUSINESS_MONTHS.map((m, i) => ({ value: String(i), label: m }))}
        />
        {admin && (
          <label className="business-filters__check">
            <input
              type="checkbox"
              checked={filterNotMediation}
              onChange={(e) => setFilterNotMediation(e.target.checked)}
            />
            <span>Apenas não intermediadas</span>
          </label>
        )}
        <Button onClick={applyFilters} className="business-filters__btn">
          <Search size={16} />
          Filtrar
        </Button>
      </div>

      <div className="business-stats">
        <div className={`business-stat${unreadTotal > 0 ? ' business-stat--alert' : ''}`}>
          <p className="business-stat__label">Mensagens não lidas</p>
          <p className="business-stat__value">{unreadTotal}</p>
        </div>
        <div className={`business-stat${negotiatingCount > 0 ? ' business-stat--active' : ''}`}>
          <p className="business-stat__label">Negociações em andamento</p>
          <p className="business-stat__value">{negotiatingCount}</p>
        </div>
      </div>

      <div className="business-table-card">
        <div className="business-table-wrap business-page-table-wrap">
          <table className="business-table business-page-table table-cards-mobile">
            <colgroup>
              {!admin && <col className="business-col-direction" />}
              <col className="business-col-type" />
              <col className="business-col-date" />
              {admin && <col className="business-col-travel" />}
              {admin && <col className="business-col-coop" />}
              {admin && <col className="business-col-coop" />}
              <col className="business-col-stops" />
              <col className="business-col-fee" />
              <col className="business-col-messages" />
              <col className="business-col-status" />
              <col className="business-col-actions" />
            </colgroup>
            <thead>
              <tr>
                {!admin && <th aria-label="Direção" />}
                <th>Tipo - ID</th>
                <th>Data</th>
                {admin && <th>Viagem</th>}
                {admin && <th>Ofertante</th>}
                {admin && <th>Solicitante</th>}
                <th>Paradas propostas</th>
                {admin ? <th>Taxa</th> : <th>Valor</th>}
                <th>Mensagens</th>
                <th>Status</th>
                <th className="business-col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: colCount }).map((__, j) => (
                      <td key={j}>
                        <span className="coops-skeleton" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={colCount}>
                    <EmptyState title="Nenhum registro encontrado" />
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((row) => {
                  const unread = businessUnreadCount(row)
                  const hasAlert = unread > 0
                  const offering = isUserOffering(row, userCoopId)
                  return (
                    <tr key={row.id}>
                      {!admin && (
                        <td data-label="Direção">
                          <img
                            src={
                              offering
                                ? '/assets/imgs/icons/arrow_received.svg'
                                : '/assets/imgs/icons/arrow_sended.svg'
                            }
                            alt={offering ? 'Oferta recebida' : 'Oferta enviada'}
                            title={offering ? 'Oferta recebida' : 'Oferta enviada'}
                            width={26}
                            height={26}
                          />
                        </td>
                      )}
                      <td data-label="Tipo - ID" className="business-table__type">
                        <button type="button" className="business-link" onClick={() => openBusinessView(row)}>
                          {row.type}-{row.id}
                        </button>
                      </td>
                      <td data-label="Data">{formatBusinessDate(row.createdAt)}</td>
                      {admin && <td data-label="Viagem">{row.travelOffer?.travel?.id ?? '—'}</td>}
                      {admin && (
                        <td data-label="Ofertante">
                          <button
                            type="button"
                            className="business-link"
                            onClick={() =>
                              row.offeringCooperative?.id && setDetailCoopId(row.offeringCooperative.id)
                            }
                          >
                            {cooperativeBusinessLabel(row.offeringCooperative)}
                          </button>
                        </td>
                      )}
                      {admin && (
                        <td data-label="Solicitante">
                          <button
                            type="button"
                            className="business-link"
                            onClick={() =>
                              row.requestingCooperative?.id &&
                              setDetailCoopId(row.requestingCooperative.id)
                            }
                          >
                            {cooperativeBusinessLabel(row.requestingCooperative)}
                          </button>
                        </td>
                      )}
                      <td data-label="Paradas" className="business-table__stops" title={getLastTravelStop(row)}>
                        {row.type === BusinessType.V ? getLastTravelStop(row) : '—'}
                      </td>
                      <td data-label={admin ? 'Taxa' : 'Valor'}>{formatBusinessFee(row.fee)}</td>
                      <td data-label="Mensagens">
                        <button
                          type="button"
                          className={`business-messages-pill${hasAlert ? ' business-messages-pill--alert' : ''}`}
                          onClick={() => openBusinessView(row)}
                        >
                          {hasAlert && <span className="business-messages-pill__dot" />}
                          <MessageSquare size={13} />
                          <span>{row.conversation?.messageCount ?? 0}</span>
                          <span className="business-messages-pill__label">Ver</span>
                        </button>
                      </td>
                      <td data-label="Status">
                        <span className={businessStatusClass(row.status)}>
                          {businessStatusLabel(row.status)}
                        </span>
                      </td>
                      <td data-label="Ações" className="business-col-actions">
                        <RowActions
                          row={row}
                          admin={admin}
                          isCooperative={isCooperative}
                          userCoopId={userCoopId}
                          onChangeValue={() => setEditBusiness(row)}
                          onMarkDone={() => markDone(row)}
                          onView={() => openBusinessView(row)}
                        />
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} total={total} limit={PAGE_SIZE} onPageChange={setPage} />

      <BusinessChangeValueModal
        open={!!editBusiness}
        business={editBusiness}
        onClose={() => setEditBusiness(null)}
        onSaved={reload}
      />
      <CooperativeDetailModal
        open={!!detailCoopId}
        cooperativeId={detailCoopId}
        onClose={() => setDetailCoopId(null)}
        onMessage={() => setDetailCoopId(null)}
      />
    </div>
  )
}

export function BusinessPage() {
  return <BusinessListPage admin />
}

export function BusinessCooperativePage() {
  return <BusinessListPage admin={false} />
}
