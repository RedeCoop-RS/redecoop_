import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, Power, Truck, UserRound, ZoomIn } from 'lucide-react'
import { cooperativeService, cooperativeLabel } from '@/services/cooperative.service'
import { driverService } from '@/services/driver.service'
import { vehicleService } from '@/services/vehicle.service'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { TableActionsMenu } from '@/components/ui/TableActionsMenu'
import { DriverModal, VehicleModal } from '@/components/modals/CoopFreteModals'
import { ShowImageModal } from '@/components/modals/ConfirmModal'
import { useModal } from '@/contexts/ModalContext'
import { useAuth } from '@/contexts/AuthContext'
import { environment } from '@/config/environment'
import {
  driverImage,
  formatBloodType,
  formatCpf,
  formatDateBr,
  formatPhone,
  vehicleImage,
} from '@/lib/format'
import type { Driver, Vehicle } from '@/types'

import { CooperativesTable } from '@/components/tables/CooperativesTable'

export { CooperativesTable } from '@/components/tables/CooperativesTable'

const PAGE_SIZE = 10

type CadastroTab = 'drivers' | 'vehicles'

function CoopFreteTabs({
  tab,
  driversTotal,
  vehiclesTotal,
  onChange,
}: {
  tab: CadastroTab
  driversTotal: number
  vehiclesTotal: number
  onChange: (tab: CadastroTab) => void
}) {
  return (
    <div className="coopfrete-tabs">
      <button
        type="button"
        className={`coopfrete-tab${tab === 'drivers' ? ' coopfrete-tab--active' : ''}`}
        onClick={() => onChange('drivers')}
      >
        <UserRound size={18} />
        Motoristas
        <span className="coopfrete-tab__count">{driversTotal}</span>
      </button>
      <button
        type="button"
        className={`coopfrete-tab${tab === 'vehicles' ? ' coopfrete-tab--active' : ''}`}
        onClick={() => onChange('vehicles')}
      >
        <Truck size={18} />
        Veículos
        <span className="coopfrete-tab__count">{vehiclesTotal}</span>
      </button>
    </div>
  )
}

export function DriversTable({
  cooperativeFilter,
  embedded = false,
  onTotalChange,
}: {
  cooperativeFilter?: number
  embedded?: boolean
  onTotalChange?: (total: number) => void
}) {
  const { isAdmin } = useAuth()
  const { confirm } = useModal()
  const [filterCoop, setFilterCoop] = useState(String(cooperativeFilter ?? ''))
  const [coops, setCoops] = useState<{ id: number; fantasyName?: string; companyName?: string; name?: string }[]>([])
  const [rows, setRows] = useState<Driver[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editDriver, setEditDriver] = useState<Driver | null | undefined>(undefined)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (isAdmin) cooperativeService.select().then(setCoops)
  }, [isAdmin])

  const reload = () => setReloadKey((k) => k + 1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const coopId = filterCoop ? Number(filterCoop) : cooperativeFilter
      const result = await driverService.list(page, PAGE_SIZE, coopId)
      setRows(result.data)
      setTotal(result.total)
      onTotalChange?.(result.total)
    } catch {
      toast.error('Erro ao carregar motoristas')
      setRows([])
      setTotal(0)
      onTotalChange?.(0)
    } finally {
      setLoading(false)
    }
  }, [page, filterCoop, cooperativeFilter, reloadKey, onTotalChange])

  useEffect(() => {
    load()
  }, [load])

  const toggleStatus = async (row: Driver) => {
    const next = row.active === false
    const ok = await confirm({
      title: `${next ? 'Ativar' : 'Inativar'} motorista`,
      message: `Deseja ${next ? 'ativar' : 'inativar'} ${row.name}?`,
    })
    if (!ok) return
    try {
      await driverService.changeStatus(row.id, next)
      toast.success(`Motorista ${next ? 'ativado' : 'inativado'}!`)
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const tableContent = (
    <>
      <div className="coopfrete-panel__toolbar">
        {isAdmin && (
          <div className="coopfrete-panel__filter">
            <Select
              label="Cooperativa"
              value={filterCoop}
              onChange={(e) => {
                setFilterCoop(e.target.value)
                setPage(1)
              }}
              placeholder="Todas"
              options={coops.map((c) => ({ value: c.id, label: cooperativeLabel(c) }))}
            />
          </div>
        )}
        <div className="coopfrete-panel__toolbar-meta">
          <span className="coopfrete-panel__badge">
            {total} motorista{total !== 1 ? 's' : ''}
          </span>
          <Button onClick={() => setEditDriver(null)}>
            <Plus size={16} />
            Cadastrar motorista
          </Button>
        </div>
      </div>

      <div className="business-table-card">
        <div className="business-table-wrap coopfrete-table-wrap">
          <table className="business-table coopfrete-drivers-table table-cards-mobile">
            <thead>
              <tr>
                {isAdmin && <th>Cooperativa</th>}
                <th>Foto</th>
                <th>Nome</th>
                <th>Contato</th>
                <th>CPF</th>
                <th>CNH</th>
                <th>Nascimento</th>
                <th>Contato seg.</th>
                <th>Tipo S.</th>
                <th>Status</th>
                <th className="coopfrete-col-actions" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isAdmin ? 11 : 10 }).map((__, j) => (
                      <td key={j}><span className="coops-skeleton" /></td>
                    ))}
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 11 : 10}>
                    <EmptyState title="Nenhum motorista cadastrado" />
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => {
                  const img = driverImage(row)
                  const isActive = row.active !== false
                  return (
                    <tr key={row.id}>
                      {isAdmin && (
                        <td data-label="Cooperativa">{row.cooperative?.companyName ?? row.cooperative?.fantasyName ?? '—'}</td>
                      )}
                      <td data-label="Foto">
                        {img ? (
                          <button
                            type="button"
                            className="coops-thumb"
                            title="Ampliar imagem"
                            onClick={() => setImageSrc(`${environment.storageUrl}${img}`)}
                          >
                            <img src={`${environment.storageUrl}${img}`} alt={row.name} loading="lazy" />
                            <span className="coops-thumb__zoom" aria-hidden>
                              <ZoomIn size={12} strokeWidth={2.5} />
                            </span>
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td data-label="Nome" className="coopfrete-col-name">{row.name}</td>
                      <td data-label="Contato">{formatPhone(row.phone)}</td>
                      <td data-label="CPF">{formatCpf(row.cpf)}</td>
                      <td data-label="CNH">
                        {row.cnhCategory && row.numberCnh
                          ? `${row.cnhCategory}-${row.numberCnh}`
                          : '—'}
                      </td>
                      <td data-label="Nascimento">{formatDateBr(row.dateBirth)}</td>
                      <td data-label="Contato seg.">{formatPhone(row.securityContact)}</td>
                      <td data-label="Tipo S.">{formatBloodType(row.bloodType)}</td>
                      <td data-label="Status">
                        <span className={`badge ${isActive ? 'badge--green' : 'badge--red'}`}>
                          {isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td data-label="Ações" className="coopfrete-col-actions">
                        <TableActionsMenu
                          row={row}
                          actions={[
                            {
                              label: 'Editar',
                              icon: <Pencil size={15} />,
                              onClick: () => setEditDriver(row),
                            },
                            {
                              label: isActive ? 'Inativar' : 'Ativar',
                              icon: <Power size={15} />,
                              onClick: () => toggleStatus(row),
                            },
                          ]}
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
    </>
  )

  return (
    <>
      {embedded ? (
        <section className="coopfrete-panel">{tableContent}</section>
      ) : (
        <section className="coopfrete-section">
          <div className="coopfrete-section__header">
            <div className="coopfrete-section__intro">
              <div className="coopfrete-section__icon"><UserRound size={20} /></div>
              <div>
                <h2 className="coopfrete-section__title">Motoristas</h2>
                <span className="coopfrete-section__count">{total} motorista{total !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          {tableContent}
        </section>
      )}

      <DriverModal
        open={editDriver !== undefined}
        driver={editDriver}
        onClose={() => setEditDriver(undefined)}
        onSaved={reload}
      />
      <ShowImageModal open={!!imageSrc} src={imageSrc ?? ''} onClose={() => setImageSrc(null)} />
    </>
  )
}

export function VehiclesTable({
  cooperativeFilter,
  embedded = false,
  onTotalChange,
}: {
  cooperativeFilter?: number
  embedded?: boolean
  onTotalChange?: (total: number) => void
}) {
  const { isAdmin } = useAuth()
  const { confirm } = useModal()
  const [filterCoop, setFilterCoop] = useState(String(cooperativeFilter ?? ''))
  const [coops, setCoops] = useState<{ id: number; fantasyName?: string; companyName?: string; name?: string }[]>([])
  const [rows, setRows] = useState<Vehicle[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null | undefined>(undefined)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (isAdmin) cooperativeService.select().then(setCoops)
  }, [isAdmin])

  const reload = () => setReloadKey((k) => k + 1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const coopId = filterCoop ? Number(filterCoop) : cooperativeFilter
      const result = await vehicleService.list(page, PAGE_SIZE, coopId)
      setRows(result.data)
      setTotal(result.total)
      onTotalChange?.(result.total)
    } catch {
      toast.error('Erro ao carregar veículos')
      setRows([])
      setTotal(0)
      onTotalChange?.(0)
    } finally {
      setLoading(false)
    }
  }, [page, filterCoop, cooperativeFilter, reloadKey, onTotalChange])

  useEffect(() => {
    load()
  }, [load])

  const toggleStatus = async (row: Vehicle) => {
    const next = row.active === false
    const ok = await confirm({
      title: `${next ? 'Ativar' : 'Inativar'} veículo`,
      message: `Deseja ${next ? 'ativar' : 'inativar'} ${row.model}?`,
    })
    if (!ok) return
    try {
      await vehicleService.changeStatus(row.id, next)
      toast.success(`Veículo ${next ? 'ativado' : 'inativado'}!`)
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  const tableContent = (
    <>
      <div className="coopfrete-panel__toolbar">
        {isAdmin && (
          <div className="coopfrete-panel__filter">
            <Select
              label="Cooperativa"
              value={filterCoop}
              onChange={(e) => {
                setFilterCoop(e.target.value)
                setPage(1)
              }}
              placeholder="Todas"
              options={coops.map((c) => ({ value: c.id, label: cooperativeLabel(c) }))}
            />
          </div>
        )}
        <div className="coopfrete-panel__toolbar-meta">
          <span className="coopfrete-panel__badge">
            {total} veículo{total !== 1 ? 's' : ''}
          </span>
          <Button onClick={() => setEditVehicle(null)}>
            <Plus size={16} />
            Cadastrar veículo
          </Button>
        </div>
      </div>

      <div className="business-table-card">
        <div className="business-table-wrap coopfrete-table-wrap">
          <table className="business-table coopfrete-vehicles-table table-cards-mobile">
            <thead>
              <tr>
                {isAdmin && <th>Cooperativa</th>}
                <th>Foto</th>
                <th>Modelo</th>
                <th>Placa</th>
                <th>Tipo</th>
                <th>Volume</th>
                <th>Peso máx.</th>
                <th>Viagens</th>
                <th>Status</th>
                <th className="coopfrete-col-actions" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: isAdmin ? 10 : 9 }).map((__, j) => (
                      <td key={j}><span className="coops-skeleton" /></td>
                    ))}
                  </tr>
                ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9}>
                    <EmptyState title="Nenhum veículo cadastrado" />
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => {
                  const img = vehicleImage(row)
                  const isActive = row.active !== false
                  return (
                    <tr key={row.id}>
                      {isAdmin && (
                        <td data-label="Cooperativa">{row.cooperative?.companyName ?? row.cooperative?.fantasyName ?? '—'}</td>
                      )}
                      <td data-label="Foto">
                        {img ? (
                          <button
                            type="button"
                            className="business-link"
                            onClick={() => setImageSrc(`${environment.storageUrl}${img}`)}
                          >
                            Ver
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td data-label="Modelo" className="coopfrete-col-name">{row.model}</td>
                      <td data-label="Placa">{row.licensePlate ?? '—'}</td>
                      <td data-label="Tipo">{row.type?.name ?? '—'}</td>
                      <td data-label="Volume">{row.volume != null ? `${row.volume}m³` : '—'}</td>
                      <td data-label="Peso máx.">{row.maximumWeight != null ? `${row.maximumWeight}Kg` : '—'}</td>
                      <td data-label="Viagens">{row.travelsFinishedCount ?? 0}</td>
                      <td data-label="Status">
                        <span className={`badge ${isActive ? 'badge--green' : 'badge--red'}`}>
                          {isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td data-label="Ações" className="coopfrete-col-actions">
                        <TableActionsMenu
                          row={row}
                          actions={[
                            {
                              label: 'Editar',
                              icon: <Pencil size={15} />,
                              onClick: () => setEditVehicle(row),
                            },
                            {
                              label: isActive ? 'Inativar' : 'Ativar',
                              icon: <Power size={15} />,
                              onClick: () => toggleStatus(row),
                            },
                          ]}
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
    </>
  )

  return (
    <>
      {embedded ? (
        <section className="coopfrete-panel">{tableContent}</section>
      ) : (
        <section className="coopfrete-section">
          <div className="coopfrete-section__header">
            <div className="coopfrete-section__intro">
              <div className="coopfrete-section__icon"><Truck size={20} /></div>
              <div>
                <h2 className="coopfrete-section__title">Veículos</h2>
                <span className="coopfrete-section__count">{total} veículo{total !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          {tableContent}
        </section>
      )}

      <VehicleModal
        open={editVehicle !== undefined}
        vehicle={editVehicle}
        onClose={() => setEditVehicle(undefined)}
        onSaved={reload}
      />
      <ShowImageModal open={!!imageSrc} src={imageSrc ?? ''} onClose={() => setImageSrc(null)} />
    </>
  )
}

export function CoopFreteCadastroPage() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<CadastroTab>('drivers')
  const [driversTotal, setDriversTotal] = useState(0)
  const [vehiclesTotal, setVehiclesTotal] = useState(0)

  return (
    <div className="coopfrete-cadastro-page">
      <PageHeader
        kicker="CoopFrete"
        title="Cadastro"
        description={
          isAdmin
            ? 'Gerencie cooperativas, motoristas e veículos do CoopFrete.'
            : 'Cadastre e gerencie os motoristas e veículos da sua cooperativa.'
        }
      />

      {isAdmin && (
        <div className="coopfrete-cadastro-page__coops">
          <CooperativesTable asSection />
        </div>
      )}

      <CoopFreteTabs
        tab={tab}
        driversTotal={driversTotal}
        vehiclesTotal={vehiclesTotal}
        onChange={setTab}
      />

      <div className={tab === 'drivers' ? '' : 'coopfrete-cadastro-page__hidden'}>
        <DriversTable embedded onTotalChange={setDriversTotal} />
      </div>
      <div className={tab === 'vehicles' ? '' : 'coopfrete-cadastro-page__hidden'}>
        <VehiclesTable embedded onTotalChange={setVehiclesTotal} />
      </div>
    </div>
  )
}
