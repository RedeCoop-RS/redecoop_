import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { ModelSelect } from '@/components/cooperationTerm/ModelSelect'
import { ModelBadge, StatusBadge } from '@/components/cooperationTerm/TermBadges'
import { formatWhen } from '@/components/cooperationTerm/format'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermModel, CooperationTermSummary } from '@/types/cooperationTerm'

const emptyDraft = {
  name: '',
  processNumber: '',
  buyerInstitution: '',
  buyerEmail: '',
  model: 'GHC' as CooperationTermModel,
}

export function CooperationTermsPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const base = isAdmin ? '/admin/termos-de-cooperacao' : '/cooperativa/termos-de-cooperacao'
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<CooperationTermSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await cooperationTermService.list(page, 20, applied)
      setRows(result.items)
      setTotal(result.total)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível carregar os termos.')
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [applied, page])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setDraft(emptyDraft)
    setCreating(true)
  }

  const create = async () => {
    if (!draft.name.trim() || !draft.processNumber.trim() || !draft.buyerInstitution.trim()) {
      toast.error('Informe nome, processo e instituição compradora.')
      return
    }
    setSaving(true)
    try {
      const created = await cooperationTermService.create({
        name: draft.name.trim(),
        processNumber: draft.processNumber.trim(),
        buyerInstitution: draft.buyerInstitution.trim(),
        buyerEmail: draft.buyerEmail.trim() || null,
        model: draft.model,
      })
      toast.success('Termo criado.')
      setCreating(false)
      navigate(`${base}/${created.id}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível criar o termo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        kicker="Comercial"
        title="Termo de Cooperação"
        description={
          isAdmin
            ? 'Editais preenchidos durante as reuniões: interesse, divisão das cotas, calendário e versão firmada.'
            : 'Termos firmados e divisões liberadas para a sua cooperativa. A consulta é somente leitura.'
        }
        actions={
          isAdmin ? (
            <Button onClick={openCreate}>
              <Plus size={16} /> Novo termo
            </Button>
          ) : undefined
        }
      />

      <div className="panel-card">
        <div className="panel-card__body">
          <form
            className="mb-4 flex max-w-xl gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setApplied(query)
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-grey" />
              <Input
                aria-label="Buscar termo"
                placeholder="Nome, processo ou instituição"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">Buscar</Button>
          </form>

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-12 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Nenhum termo encontrado"
              description={
                isAdmin
                  ? 'Crie o edital para registrar a reunião com as cooperativas.'
                  : 'Quando um termo for firmado, ou a divisão for liberada para a sua cooperativa, ele aparece aqui.'
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Edital</th>
                      <th>Processo</th>
                      <th>Instituição</th>
                      <th>Modelo</th>
                      <th>Versão</th>
                      <th>Situação</th>
                      <th>Itens</th>
                      <th>Atualizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`${base}/${row.id}`)}
                      >
                        <td>
                          <Link to={`${base}/${row.id}`} className="font-medium text-green-dark hover:underline">
                            {row.name}
                          </Link>
                        </td>
                        <td>{row.processNumber}</td>
                        <td>{row.buyerInstitution}</td>
                        <td><ModelBadge model={row.model} /></td>
                        <td>{row.version}</td>
                        <td>
                          <span className="inline-flex flex-wrap gap-1">
                            <StatusBadge status={row.status} />
                            {row.status === 'DRAFT' && row.divisionReleased && (
                              <span className="term-pill term-pill--signed">Divisão liberada</span>
                            )}
                          </span>
                        </td>
                        <td>{row.itemCount}</td>
                        <td>{formatWhen(row.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={total} limit={20} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Modal open={creating} onClose={() => !saving && setCreating(false)} title="Novo termo" size="lg">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void create()
          }}
        >
          <Input label="Nome do edital" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <Input label="Número do processo" value={draft.processNumber} onChange={(event) => setDraft({ ...draft, processNumber: event.target.value })} />
          <Input label="Instituição compradora" value={draft.buyerInstitution} onChange={(event) => setDraft({ ...draft, buyerInstitution: event.target.value })} />
          <Input label="E-mail da instituição" type="email" value={draft.buyerEmail} onChange={(event) => setDraft({ ...draft, buyerEmail: event.target.value })} />
          <div className="sm:col-span-2">
            <ModelSelect value={draft.model} onChange={(model) => setDraft({ ...draft, model })} />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setCreating(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>Criar termo</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
