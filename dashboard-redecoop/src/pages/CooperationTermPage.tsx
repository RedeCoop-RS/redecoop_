import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Download, FileSpreadsheet } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { LoadingOverlay } from '@/components/ui/LoadingOverlay'
import { ModelBadge, StatusBadge } from '@/components/cooperationTerm/TermBadges'
import { DivisionSheet, TermDocumentTable } from '@/components/cooperationTerm/TermDocumentTable'
import { TermDataStep } from '@/components/cooperationTerm/TermDataStep'
import { TermInterestStep } from '@/components/cooperationTerm/TermInterestStep'
import { TermDivisionStep } from '@/components/cooperationTerm/TermDivisionStep'
import { TermCalendarStep } from '@/components/cooperationTerm/TermCalendarStep'
import { TermSignStep } from '@/components/cooperationTerm/TermSignStep'
import { formatWhen } from '@/components/cooperationTerm/format'
import { useAuth } from '@/contexts/AuthContext'
import { ApiError } from '@/lib/api'
import { cooperativeLabel, cooperativeService } from '@/services/cooperative.service'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail, CooperationTermModel } from '@/types/cooperationTerm'

const steps = [
  { id: 'dados', label: 'Dados e itens' },
  { id: 'interesse', label: 'Interesse' },
  { id: 'divisao', label: 'Divisão' },
  { id: 'calendario', label: 'Calendário' },
  { id: 'firmar', label: 'Firmar' },
] as const

type StepId = (typeof steps)[number]['id']

export function CooperationTermPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const base = isAdmin ? '/admin/termos-de-cooperacao' : '/cooperativa/termos-de-cooperacao'
  const creating = id === 'novo'

  const [term, setTerm] = useState<CooperationTermDetail | null>(null)
  const [loading, setLoading] = useState(!creating)
  const [step, setStep] = useState<StepId>('dados')
  const [cooperatives, setCooperatives] = useState<{ id: number; label: string }[]>([])
  const [draft, setDraft] = useState({
    name: '',
    processNumber: '',
    buyerInstitution: '',
    buyerEmail: '',
    model: 'GHC' as CooperationTermModel,
  })
  const [creatingBusy, setCreatingBusy] = useState(false)

  useEffect(() => {
    if (creating) {
      if (!isAdmin) navigate(base, { replace: true })
      return
    }
    const numericId = Number(id)
    if (!numericId) {
      navigate(base, { replace: true })
      return
    }
    let active = true
    setLoading(true)
    cooperationTermService
      .get(numericId)
      .then((detail) => {
        if (active) setTerm(detail)
      })
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : 'Termo não encontrado.')
        if (active) navigate(base, { replace: true })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [base, creating, id, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin || creating) return
    let active = true
    cooperativeService
      .select()
      .then((rows) => {
        if (!active) return
        const options = (Array.isArray(rows) ? rows : []).map((row) => ({
          id: row.id,
          label: cooperativeLabel(row),
        }))
        options.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
        setCooperatives(options)
      })
      .catch(() => {
        if (active) toast.error('Não foi possível carregar as cooperativas.')
      })
    return () => {
      active = false
    }
  }, [creating, isAdmin])

  const download = async (kind: 'pdf' | 'excel') => {
    if (!term) return
    try {
      await cooperationTermService.download(term.id, kind)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível baixar o arquivo.')
    }
  }

  const create = async () => {
    if (!draft.name.trim() || !draft.processNumber.trim() || !draft.buyerInstitution.trim()) {
      toast.error('Informe nome, processo e instituição compradora.')
      return
    }
    setCreatingBusy(true)
    try {
      const created = await cooperationTermService.create({
        name: draft.name.trim(),
        processNumber: draft.processNumber.trim(),
        buyerInstitution: draft.buyerInstitution.trim(),
        buyerEmail: draft.buyerEmail.trim() || null,
        model: draft.model,
      })
      toast.success('Termo criado.')
      navigate(`${base}/${created.id}`, { replace: true })
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível criar o termo.')
    } finally {
      setCreatingBusy(false)
    }
  }

  if (creating) {
    return (
      <div>
        <PageHeader
          kicker="Termo de Cooperação"
          title="Novo termo"
          description="Nome, processo, instituição compradora e o modelo do edital."
        />
        <section className="panel-card">
          <div className="panel-card__body grid max-w-3xl gap-4">
            <Input label="Nome do edital" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <Input label="Número do processo" value={draft.processNumber} onChange={(event) => setDraft({ ...draft, processNumber: event.target.value })} />
            <Input label="Instituição compradora" value={draft.buyerInstitution} onChange={(event) => setDraft({ ...draft, buyerInstitution: event.target.value })} />
            <Input label="E-mail da instituição" type="email" value={draft.buyerEmail} onChange={(event) => setDraft({ ...draft, buyerEmail: event.target.value })} />
            <Select
              label="Modelo"
              value={draft.model}
              onChange={(event) => setDraft({ ...draft, model: event.target.value as CooperationTermModel })}
              options={[
                { value: 'GHC', label: 'GHC — quantidade por unidade hospitalar' },
                { value: 'STANDARD', label: 'Padrão — quantidade, valor unitário e valor total' },
              ]}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(base)}>Cancelar</Button>
              <Button onClick={create} disabled={creatingBusy}>Criar termo</Button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (loading || !term) return <LoadingOverlay visible message="Carregando termo..." />

  const downloads = term.canDownload ? (
    <>
      <Button variant="outline" onClick={() => download('pdf')}>
        <Download size={16} /> PDF
      </Button>
      <Button variant="outline" onClick={() => download('excel')}>
        <FileSpreadsheet size={16} /> Excel
      </Button>
    </>
  ) : undefined

  return (
    <div className="space-y-6">
      <Link to={base} className="text-sm font-medium text-green hover:underline">
        Voltar para a lista
      </Link>
      <PageHeader
        kicker="Termo de Cooperação"
        title={term.name}
        description={`${term.buyerInstitution} · Processo ${term.processNumber}`}
        actions={downloads}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge status={term.status} />
        <ModelBadge model={term.model} />
        <span className="text-grey-dark">Versão {term.version}</span>
        {term.signedAt && <span className="text-grey-dark">Firmado em {formatWhen(term.signedAt)}</span>}
        {term.divisionReleased && term.status === 'DRAFT' && (
          <span className="text-green-dark">Divisão liberada</span>
        )}
      </div>

      {term.versions.length > 1 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {term.versions.map((version) => (
            <Link
              key={version.id}
              to={`${base}/${version.id}`}
              className={`rounded-full px-3 py-1 ${version.id === term.id ? 'bg-green text-white' : 'bg-white text-grey-dark ring-1 ring-gray-200'}`}
            >
              v{version.version} · {version.status === 'SIGNED' ? 'Firmado' : 'Rascunho'}
            </Link>
          ))}
        </div>
      )}

      {term.scope === 'division' && (
        <>
          <p className="rounded-xl bg-green-soft px-4 py-3 text-sm text-green-dark">
            A divisão deste termo foi liberada para consulta. O rascunho completo ainda não está firmado.
          </p>
          <DivisionSheet term={term} />
        </>
      )}

      {term.scope === 'full' && !term.canEdit && (
        <>
          <TermDocumentTable term={term} />
          {isAdmin && <TermSignStep term={term} basePath={base} onChange={setTerm} />}
        </>
      )}

      {term.canEdit && (
        <>
          <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Etapas do termo">
            {steps.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={step === item.id}
                onClick={() => setStep(item.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${step === item.id ? 'bg-green text-white' : 'bg-white text-grey-dark ring-1 ring-gray-200'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {step === 'dados' && <TermDataStep term={term} onChange={setTerm} />}
          {step === 'interesse' && <TermInterestStep term={term} cooperatives={cooperatives} onChange={setTerm} />}
          {step === 'divisao' && <TermDivisionStep term={term} onChange={setTerm} />}
          {step === 'calendario' && <TermCalendarStep term={term} onChange={setTerm} />}
          {step === 'firmar' && (
            <div className="space-y-4">
              <TermDocumentTable term={term} />
              <TermSignStep term={term} basePath={base} onChange={setTerm} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
