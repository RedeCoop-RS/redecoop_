import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Eye, Key, Pencil, Plus, Power, RefreshCw, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { TableActionsMenu, type TableAction } from '@/components/ui/TableActionsMenu'
import { ApiError } from '@/lib/api'

export interface TableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
}

export interface RowAction<T> extends TableAction<T> {}

interface DataPageProps<T> {
  kicker?: string
  title: string
  description?: string
  createLabel?: string
  onCreate?: () => void
  fetchData: (page: number, limit: number) => Promise<{ data: T[]; total: number }>
  columns: TableColumn<T>[]
  actions?: RowAction<T>[]
  searchFilter?: (row: T, query: string) => boolean
  emptyTitle?: string
  emptyDescription?: string
  pageSize?: number
  extraHeader?: ReactNode
}

export function DataPage<T extends { id?: number | string }>({
  kicker,
  title,
  description,
  createLabel = 'Novo',
  onCreate,
  fetchData,
  columns,
  actions = [],
  searchFilter,
  emptyTitle,
  emptyDescription,
  pageSize = 10,
  extraHeader,
}: DataPageProps<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchData(page, pageSize)
      setRows(Array.isArray(result.data) ? result.data : [])
      setTotal(result.total)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao carregar dados'
      toast.error(message)
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [fetchData, page, pageSize])

  useEffect(() => {
    load()
  }, [load])

  const filtered = searchFilter && search
    ? rows.filter((row) => searchFilter(row, search))
    : rows

  const cols = actions.length > 0 ? [...columns, { key: 'actions', header: 'Ações', render: () => null }] : columns

  return (
    <div>
      <PageHeader
        kicker={kicker}
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" onClick={load} className="!px-4">
              <RefreshCw size={16} />
            </Button>
            {onCreate && (
              <Button onClick={onCreate}>
                <Plus size={16} />
                {createLabel}
              </Button>
            )}
          </>
        }
      />

      {extraHeader}

      <div className="panel-card">
        <div className="panel-card__body">
          {searchFilter && (
            <div className="mb-4 max-w-md">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          ) : (
            <>
              <div className="overflow-x-auto overflow-hidden rounded-lg border border-gray-200">
                <table className="data-table table-cards-mobile">
                  <thead>
                    <tr>
                      {cols.map((col) => (
                        <th key={col.key}>{col.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => (
                      <tr key={row.id ?? i}>
                        {columns.map((col) => (
                          <td key={col.key} data-label={col.header}>{col.render(row)}</td>
                        ))}
                        {actions.length > 0 && (
                          <td data-label="Ações">
                            <TableActionsMenu row={row} actions={actions} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={total} limit={pageSize} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export const rowActions = {
  edit: (onClick: (row: never) => void): RowAction<never> => ({
    label: 'Editar',
    icon: <Pencil size={16} />,
    onClick,
  }),
  view: (onClick: (row: never) => void): RowAction<never> => ({
    label: 'Ver',
    icon: <Eye size={16} />,
    onClick,
  }),
  delete: (onClick: (row: never) => void): RowAction<never> => ({
    label: 'Excluir',
    icon: <Trash2 size={16} />,
    variant: 'danger',
    onClick,
  }),
  toggle: (onClick: (row: never) => void): RowAction<never> => ({
    label: 'Ativar/Desativar',
    icon: <Power size={16} />,
    onClick,
  }),
  password: (onClick: (row: never) => void): RowAction<never> => ({
    label: 'Senha',
    icon: <Key size={16} />,
    onClick,
  }),
}
