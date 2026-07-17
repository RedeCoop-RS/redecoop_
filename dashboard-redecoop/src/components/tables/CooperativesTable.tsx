import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Building2,
  Eye,
  Key,
  Pencil,
  Plus,
  Power,
  Search,
  Wallet,
} from 'lucide-react'
import { cooperativeService } from '@/services/cooperative.service'
import {
  ChangePasswordModal,
  CooperativeCreateModal,
  CooperativeDetailModal,
  CooperativeEditModal,
  DirectMessageModal,
} from '@/components/modals/CooperativeModals'
import { ShowImageModal } from '@/components/modals/ConfirmModal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableActionsMenu } from '@/components/ui/TableActionsMenu'
import { useModal } from '@/contexts/ModalContext'
import { environment } from '@/config/environment'
import { ApiError } from '@/lib/api'
import { cleanText } from '@/lib/text'
import type { Cooperative } from '@/types'

const PAGE_SIZE = 10

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function truncate(text: string | undefined | null, max = 40) {
  const clean = cleanText(text)
  if (!clean) return ''
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

function cooperativeDisplayName(row: Cooperative) {
  const company = row.companyName ?? row.name ?? ''
  const fantasy = row.fantasyName
  if (company && fantasy) return `${company} (${fantasy})`
  return company || fantasy || '—'
}

function matchesSearch(row: Cooperative, query: string) {
  const q = query.toLowerCase().trim()
  if (!q) return true
  const cnpj = (row.cnpj ?? '').replace(/\D/g, '')
  const qDigits = q.replace(/\D/g, '')
  return (
    cooperativeDisplayName(row).toLowerCase().includes(q) ||
    cleanText(row.description).toLowerCase().includes(q) ||
    (row.street ?? '').toLowerCase().includes(q) ||
    (qDigits.length > 0 && cnpj.includes(qDigits))
  )
}

function RowActionsMenu({
  row,
  onView,
  onEdit,
  onToggleStatus,
  onChangePassword,
}: {
  row: Cooperative
  onView: () => void
  onEdit: () => void
  onToggleStatus: () => void
  onChangePassword: () => void
}) {
  return (
    <TableActionsMenu
      row={row}
      quickAction={{
        label: 'Ver detalhes',
        icon: <Eye size={16} />,
        onClick: () => onView(),
      }}
      actions={[
        {
          label: 'Editar',
          icon: <Pencil size={15} />,
          onClick: () => onEdit(),
        },
        {
          label: row.active !== false ? 'Inativar' : 'Ativar',
          icon: <Power size={15} />,
          onClick: () => onToggleStatus(),
        },
        {
          label: 'Alterar senha',
          icon: <Key size={15} />,
          onClick: () => onChangePassword(),
        },
      ]}
    />
  )
}

export function CooperativesTable({ asSection = false }: { asSection?: boolean }) {
  const { confirm } = useModal()
  const [rows, setRows] = useState<Cooperative[]>([])
  const [total, setTotal] = useState(0)
  const [totalDebits, setTotalDebits] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [passwordId, setPasswordId] = useState<number | null>(null)
  const [messageCoopId, setMessageCoopId] = useState<number | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  const reload = () => setReloadKey((k) => k + 1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await cooperativeService.list(page, PAGE_SIZE)
      setRows(result.data)
      setTotal(result.total)
      setTotalDebits(result.totalDebits)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao carregar cooperativas'
      toast.error(message)
      setRows([])
      setTotal(0)
      setTotalDebits(0)
    } finally {
      setLoading(false)
    }
  }, [page, reloadKey])

  useEffect(() => {
    load()
  }, [load])

  const filtered = rows.filter((row) => matchesSearch(row, search))

  const toggleStatus = async (row: Cooperative) => {
    const nextActive = row.active === false
    const action = nextActive ? 'ativar' : 'inativar'
    const ok = await confirm({
      title: `${nextActive ? 'Ativar' : 'Inativar'} cooperativa`,
      message: `Tem certeza de que deseja ${action} "${cooperativeDisplayName(row)}"?`,
    })
    if (!ok) return
    try {
      await cooperativeService.changeStatus(row.id, nextActive)
      toast.success(`Cooperativa ${nextActive ? 'ativada' : 'inativada'} com sucesso.`)
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar status')
    }
  }

  const showImage = (img?: string) => {
    if (!img) return
    setImageSrc(`${environment.storageUrl}${img}`)
  }

  return (
    <div className={asSection ? 'coopfrete-section coopfrete-section--coops' : 'coops-page'}>
      {!asSection && (
        <PageHeader
          title="Cooperativas"
          description="Gerencie cadastros, status e informações das cooperativas da rede."
          actions={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Cadastrar cooperativa
            </Button>
          }
        />
      )}

      {asSection && (
        <div className="coopfrete-section__header">
          <div className="coopfrete-section__intro">
            <div className="coopfrete-section__icon">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="coopfrete-section__title">Cooperativas</h2>
              <span className="coopfrete-section__count">
                {total} cooperativa{total !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="coopfrete-section__actions">
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              Cadastrar cooperativa
            </Button>
          </div>
        </div>
      )}

      <div className="coops-stats">
        <div className="coops-stat">
          <Building2 size={18} className="coops-stat__icon" />
          <div>
            <p className="coops-stat__label">Total cadastradas</p>
            <p className="coops-stat__value">
              {total} cooperativa{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="coops-stat coops-stat--debit">
          <Wallet size={18} className="coops-stat__icon" />
          <div>
            <p className="coops-stat__label">Débito total</p>
            <p className="coops-stat__value">R$ {formatMoney(totalDebits)}</p>
          </div>
        </div>
      </div>

      <div className="coops-toolbar">
        <div className="coops-search">
          <Search size={16} className="coops-search__icon" />
          <Input
            placeholder="Pesquisar por nome, CNPJ, endereço…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!pl-10"
          />
        </div>
      </div>

      <div className="coops-table-card dashboard-scroll">
        <div className="coops-table-wrap">
          <table className="coops-table table-cards-mobile">
            <thead>
              <tr>
                <th className="coops-table__col-img">Imagem</th>
                <th className="coops-table__col-name">Nome</th>
                <th className="coops-table__col-desc">Descrição</th>
                <th className="coops-table__col-cnpj">CNPJ</th>
                <th className="coops-table__col-address">Endereço</th>
                <th className="coops-table__col-debit">Débito</th>
                <th className="coops-table__col-status">Status</th>
                <th className="coops-table__col-actions" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={`sk-${i}`} className="coops-table__row coops-table__row--loading">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}>
                        <span className="coops-skeleton" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      title="Nenhum registro encontrado"
                      description={search ? 'Tente outro termo de busca.' : 'Cadastre a primeira cooperativa.'}
                    />
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((row) => {
                  const img = row.img ?? row.picture
                  const debits = row.totalDebits ?? 0
                  return (
                    <tr key={row.id} className="coops-table__row">
                      <td data-label="Imagem">
                        {img ? (
                          <button
                            type="button"
                            className="coops-thumb"
                            title="Ampliar imagem"
                            onClick={() => showImage(img)}
                          >
                            <img
                              src={`${environment.storageUrl}${img}`}
                              alt={cooperativeDisplayName(row)}
                              loading="lazy"
                            />
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td data-label="Nome" className="coops-table__col-name">
                        <button
                          type="button"
                          className="coops-name-btn"
                          title={cooperativeDisplayName(row)}
                          onClick={() => setDetailId(row.id)}
                        >
                          {cooperativeDisplayName(row)}
                        </button>
                      </td>
                      <td
                        data-label="Descrição"
                        className="coops-table__col-desc"
                        title={cleanText(row.description) || undefined}
                      >
                        {truncate(row.description)}
                      </td>
                      <td data-label="CNPJ" className="coops-table__col-cnpj">{row.cnpj ?? '—'}</td>
                      <td data-label="Endereço" className="coops-table__col-address" title={row.street}>
                        {row.street ?? '—'}
                      </td>
                      <td data-label="Débito" className="coops-table__col-debit">
                        {!debits ? (
                          '—'
                        ) : (
                          <span className="coops-debit">
                            R$ {formatMoney(debits)}
                            <span className="coops-debit__hint">Gerar guia</span>
                          </span>
                        )}
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${row.active !== false ? 'badge--green' : 'badge--red'}`}>
                          {row.active !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td data-label="Ações">
                        <RowActionsMenu
                          row={row}
                          onView={() => setDetailId(row.id)}
                          onEdit={() => setEditId(row.id)}
                          onToggleStatus={() => toggleStatus(row)}
                          onChangePassword={() => setPasswordId(row.id)}
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

      <CooperativeCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={reload} />
      <CooperativeEditModal
        open={!!editId}
        cooperativeId={editId}
        onClose={() => setEditId(null)}
        onSaved={reload}
      />
      <CooperativeDetailModal
        open={!!detailId}
        cooperativeId={detailId}
        onClose={() => setDetailId(null)}
        onMessage={(id) => {
          setDetailId(null)
          setMessageCoopId(id)
        }}
      />
      <ChangePasswordModal
        open={!!passwordId}
        cooperativeId={passwordId}
        onClose={() => setPasswordId(null)}
        onSaved={reload}
      />
      <DirectMessageModal
        open={!!messageCoopId}
        defaultCooperativeId={messageCoopId ?? undefined}
        onClose={() => setMessageCoopId(null)}
        onStarted={() => setMessageCoopId(null)}
      />
      <ShowImageModal open={!!imageSrc} src={imageSrc ?? ''} onClose={() => setImageSrc(null)} />
    </div>
  )
}
