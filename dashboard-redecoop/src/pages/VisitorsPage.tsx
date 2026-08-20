import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Check,
  Mail,
  MapPin,
  Phone,
  Power,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import { visitantService, requestService } from '@/services/misc.service'
import { CooperativeCreateModal } from '@/components/modals/CooperativeModals'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { useModal } from '@/contexts/ModalContext'
import { usePendingRequests } from '@/contexts/PendingRequestsContext'
import type { PaginationMeta } from '@/lib/api'
import type { Visitant, RegistrationRequest } from '@/types'

const ITEMS_PER_PAGE = 10

function formatBadgeCount(count: number) {
  return count > 99 ? '99+' : String(count)
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 14) return value
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

function formatDate(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

export function VisitorsPage() {
  const { confirm } = useModal()
  const { count: pendingRequests, refresh: refreshPendingCount } = usePendingRequests()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<'visitants' | 'requests'>(
    searchParams.get('tab') === 'requests' ? 'requests' : 'visitants',
  )
  const [search, setSearch] = useState('')

  const [loadingVisitant, setLoadingVisitant] = useState(false)
  const [visitors, setVisitors] = useState<Visitant[]>([])
  const [metaVisitant, setMetaVisitant] = useState<PaginationMeta | undefined>()
  const [visitantPage, setVisitantPage] = useState(1)

  const [loadingRequesters, setLoadingRequesters] = useState(false)
  const [requesters, setRequesters] = useState<RegistrationRequest[]>([])
  const [metaRequester, setMetaRequester] = useState<PaginationMeta | undefined>()
  const [requesterPage, setRequesterPage] = useState(1)
  const [acceptRequest, setAcceptRequest] = useState<RegistrationRequest | null>(null)

  const loadVisitors = useCallback(async (page: number) => {
    setLoadingVisitant(true)
    try {
      const result = await visitantService.list(page, ITEMS_PER_PAGE)
      setVisitors(result.data)
      setMetaVisitant(result.meta)
    } catch {
      setVisitors([])
      setMetaVisitant(undefined)
    } finally {
      setLoadingVisitant(false)
    }
  }, [])

  const loadRequesters = useCallback(async (page: number) => {
    setLoadingRequesters(true)
    try {
      const result = await requestService.list(page, ITEMS_PER_PAGE)
      setRequesters(result.data)
      setMetaRequester(result.meta)
      await refreshPendingCount()
    } catch {
      setRequesters([])
      setMetaRequester(undefined)
    } finally {
      setLoadingRequesters(false)
    }
  }, [refreshPendingCount])

  useEffect(() => {
    loadVisitors(visitantPage)
  }, [visitantPage, loadVisitors])

  useEffect(() => {
    loadRequesters(requesterPage)
  }, [requesterPage, loadRequesters])

  const refreshAll = () => {
    loadVisitors(visitantPage)
    loadRequesters(requesterPage)
  }

  const updateVisitantStatus = async (visitor: Visitant) => {
    const nextActive = !visitor.active
    try {
      await visitantService.changeStatus(visitor.id, nextActive)
      await loadVisitors(visitantPage)
      toast.success(`Visitante ${nextActive ? 'ativado' : 'inativado'} com sucesso.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar visitante')
    }
  }

  const deleteRequester = async (requester: RegistrationRequest) => {
    const ok = await confirm({
      title: 'Excluir solicitação',
      message: `Confirmar exclusão de ${requester.name}? Esta ação é irreversível.`,
      variant: 'danger',
      confirmLabel: 'Excluir',
    })
    if (!ok) return

    try {
      await requestService.delete(requester.id)
      await loadRequesters(requesterPage)
      toast.success('Solicitação excluída com sucesso.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir solicitação')
    }
  }

  const acceptSaved = async () => {
    if (!acceptRequest) return
    try {
      await requestService.delete(acceptRequest.id)
      setAcceptRequest(null)
      await loadRequesters(requesterPage)
      toast.success('Solicitação aceita e cooperativa cadastrada!')
    } catch {
      setAcceptRequest(null)
      await loadRequesters(requesterPage)
      toast.error('Cooperativa criada, mas houve erro ao remover a solicitação.')
    }
  }

  const filteredVisitors = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return visitors
    return visitors.filter(
      (row) =>
        row.name?.toLowerCase().includes(q) ||
        row.email?.toLowerCase().includes(q) ||
        row.phone?.includes(q.replace(/\D/g, '')),
    )
  }, [visitors, search])

  const filteredRequesters = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    if (!q) return requesters
    return requesters.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.address.toLowerCase().includes(q) ||
        (digits.length > 0 && row.cnpj.includes(digits)),
    )
  }, [requesters, search])

  return (
    <div className="visitors-page">
      <PageHeader
        title="Visitantes e solicitações"
        description="Gerencie visitantes do site e aceite pedidos de cadastro de novas cooperativas."
        actions={
          <Button variant="outline" onClick={refreshAll} className="!px-4">
            <RefreshCw size={16} />
            Atualizar
          </Button>
        }
      />

      <div className="visitors-tabs">
        <button
          type="button"
          onClick={() => {
            setTab('visitants')
            setSearch('')
          }}
          className={`visitors-tab ${tab === 'visitants' ? 'visitors-tab--active' : ''}`}
        >
          <Users size={16} />
          Visitantes
          {(metaVisitant?.totalItems ?? 0) > 0 && (
            <span className="visitors-tab__count">{formatBadgeCount(metaVisitant!.totalItems)}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('requests')
            setSearch('')
          }}
          className={`visitors-tab ${tab === 'requests' ? 'visitors-tab--active' : ''} ${pendingRequests > 0 && tab !== 'requests' ? 'visitors-tab--alert' : ''}`}
        >
          <UserCheck size={16} />
          Solicitações
          {pendingRequests > 0 && (
            <span className="visitors-tab__notify">{formatBadgeCount(pendingRequests)}</span>
          )}
        </button>
      </div>

      <div className="business-stats">
        <div className="business-stat">
          <p className="business-stat__label">Visitantes cadastrados</p>
          <p className="business-stat__value">{metaVisitant?.totalItems ?? 0}</p>
        </div>
        <div className={`business-stat ${pendingRequests > 0 ? 'business-stat--alert' : ''}`}>
          <p className="business-stat__label">Solicitações pendentes</p>
          <p className="business-stat__value">{pendingRequests}</p>
        </div>
        {tab === 'visitants' && (
          <div className="business-stat">
            <p className="business-stat__label">Ativos nesta página</p>
            <p className="business-stat__value">
              {visitors.filter((v) => v.active !== false).length}
            </p>
          </div>
        )}
      </div>

      <div className="visitors-toolbar">
        <div className="visitors-search">
          <Search size={18} className="visitors-search__icon" />
          <Input
            placeholder={tab === 'visitants' ? 'Buscar visitante...' : 'Buscar solicitação...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="visitors-search__input"
          />
        </div>
        {tab === 'requests' && pendingRequests > 0 && (
          <span className="visitors-pending-pill">
            {pendingRequests === 1
              ? '1 solicitação aguardando aceite'
              : `${pendingRequests} solicitações aguardando aceite`}
          </span>
        )}
      </div>

      <div className="business-table-card">
        <div className="business-table-wrap visitors-table-wrap">
          <table className="business-table visitors-table table-cards-mobile">
            {tab === 'visitants' ? (
              <>
                <colgroup>
                  <col className="visitors-col-name" />
                  <col className="visitors-col-contact" />
                  <col className="visitors-col-address" />
                  <col className="visitors-col-status" />
                  <col className="visitors-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Contato</th>
                    <th>Endereço</th>
                    <th>Status</th>
                    <th className="visitors-col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingVisitant &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <td key={j}>
                            <span className="coops-skeleton" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  {!loadingVisitant && filteredVisitors.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState title="Nenhum visitante encontrado" />
                      </td>
                    </tr>
                  )}
                  {!loadingVisitant &&
                    filteredVisitors.map((visitor) => (
                      <tr key={visitor.id}>
                        <td data-label="Nome">
                          <strong className="visitors-name">{visitor.name ?? '—'}</strong>
                        </td>
                        <td data-label="Contato">
                          <div className="visitors-contact-stack">
                            <span className="visitors-contact" title={visitor.email ?? ''}>
                              <Mail size={14} />
                              {visitor.email ?? '—'}
                            </span>
                            <span className="visitors-contact" title={visitor.phone ?? ''}>
                              <Phone size={14} />
                              {visitor.phone ?? '—'}
                            </span>
                          </div>
                        </td>
                        <td data-label="Endereço">
                          <span className="visitors-contact visitors-contact--address" title={visitor.address ?? ''}>
                            <MapPin size={14} />
                            {visitor.address ?? '—'}
                          </span>
                        </td>
                        <td data-label="Status">
                          <span
                            className={`badge ${visitor.active !== false ? 'badge--green' : 'badge--red'}`}
                          >
                            {visitor.active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td data-label="Ações" className="visitors-col-actions">
                          <div className="visitors-actions">
                            {visitor.active !== false ? (
                              <button
                                type="button"
                                className="visitors-action-btn visitors-action-btn--inactive"
                                onClick={() => updateVisitantStatus(visitor)}
                              >
                                <Power size={14} />
                                Inativar
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="visitors-action-btn visitors-action-btn--accept"
                                onClick={() => updateVisitantStatus(visitor)}
                              >
                                <Power size={14} />
                                Ativar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </>
            ) : (
              <>
                <colgroup>
                  <col className="visitors-col-name" />
                  <col className="visitors-col-cnpj" />
                  <col className="visitors-col-contact" />
                  <col className="visitors-col-address" />
                  <col className="visitors-col-date" />
                  <col className="visitors-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Cooperativa</th>
                    <th>CNPJ</th>
                    <th>Contato</th>
                    <th>Endereço</th>
                    <th className="visitors-col-date">Data</th>
                    <th className="visitors-col-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRequesters &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j}>
                            <span className="coops-skeleton" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  {!loadingRequesters && filteredRequesters.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState title="Nenhuma solicitação encontrada" />
                      </td>
                    </tr>
                  )}
                  {!loadingRequesters &&
                    filteredRequesters.map((request) => (
                      <tr key={request.id} className="visitors-request-row">
                        <td data-label="Cooperativa">
                          <strong className="visitors-name">{request.name}</strong>
                        </td>
                        <td data-label="CNPJ">
                          <span className="visitors-cnpj__value">{formatCnpj(request.cnpj)}</span>
                        </td>
                        <td data-label="Contato">
                          <div className="visitors-contact-stack">
                            <span className="visitors-contact" title={request.email}>
                              <Mail size={14} />
                              {request.email}
                            </span>
                            <span className="visitors-contact" title={request.phone}>
                              <Phone size={14} />
                              {request.phone}
                            </span>
                          </div>
                        </td>
                        <td data-label="Endereço">
                          <span className="visitors-contact visitors-contact--address" title={request.address}>
                            <MapPin size={14} />
                            {request.address}
                          </span>
                        </td>
                        <td data-label="Data" className="visitors-col-date">{formatDate(request.createdAt)}</td>
                        <td data-label="Ações" className="visitors-col-actions">
                          <div className="visitors-actions">
                            <button
                              type="button"
                              className="visitors-action-btn visitors-action-btn--accept"
                              onClick={() => setAcceptRequest(request)}
                            >
                              <Check size={14} />
                              Aceitar
                            </button>
                            <button
                              type="button"
                              className="visitors-action-btn visitors-action-btn--delete"
                              onClick={() => deleteRequester(request)}
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>

      {tab === 'visitants' ? (
        <Pagination
          page={visitantPage}
          total={metaVisitant?.totalItems ?? 0}
          limit={ITEMS_PER_PAGE}
          onPageChange={setVisitantPage}
        />
      ) : (
        <Pagination
          page={requesterPage}
          total={metaRequester?.totalItems ?? 0}
          limit={ITEMS_PER_PAGE}
          onPageChange={setRequesterPage}
        />
      )}

      <CooperativeCreateModal
        open={!!acceptRequest}
        onClose={() => setAcceptRequest(null)}
        onSaved={acceptSaved}
        title="Aceitar solicitação"
        submitLabel="Aceitar e cadastrar cooperativa"
        requestInfo={
          acceptRequest
            ? {
                name: acceptRequest.name,
                cnpj: acceptRequest.cnpj,
                address: acceptRequest.address,
                email: acceptRequest.email,
                phone: acceptRequest.phone,
                createdAt: acceptRequest.createdAt,
              }
            : undefined
        }
        initialValues={
          acceptRequest
            ? {
                companyName: acceptRequest.name,
                fantasyName: acceptRequest.name,
                email: acceptRequest.email,
                phone: acceptRequest.phone,
                cnpj: acceptRequest.cnpj,
              }
            : undefined
        }
      />
    </div>
  )
}
