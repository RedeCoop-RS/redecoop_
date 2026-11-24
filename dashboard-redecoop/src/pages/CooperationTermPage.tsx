import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Download,
  FileSpreadsheet,
  Hash,
  Info,
  Package,
  PenLine,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ModelSelect } from '@/components/cooperationTerm/ModelSelect'
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

function HeroFact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="term-fact">
      <dt className="term-fact__label">
        <Icon size={13} /> {label}
      </dt>
      <dd className="term-fact__value">{value}</dd>
    </div>
  )
}

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
            <ModelSelect value={draft.model} onChange={(model) => setDraft({ ...draft, model })} />
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

  const cooperativeCount = new Set(
    term.items.flatMap((item) => item.allocations.map((allocation) => allocation.cooperativeId)),
  ).size

  return (
    <div className="min-w-0 space-y-6">
      <section className="term-hero">
        <div className="term-hero__stripe" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="term-hero__body">
          <Link to={base} className="term-hero__back">
            <ArrowLeft size={15} /> Termos de cooperação
          </Link>
          <div className="term-hero__top">
            <div className="min-w-0">
              <p className="page-kicker">Termo de Cooperação</p>
              <h1 className="term-hero__title">{term.name}</h1>
              <div className="term-hero__chips">
                <StatusBadge status={term.status} />
                <ModelBadge model={term.model} />
                <span className="term-pill term-pill--neutral">Versão {term.version}</span>
                {term.divisionReleased && term.status === 'DRAFT' && (
                  <span className="term-pill term-pill--signed">Divisão liberada</span>
                )}
              </div>
            </div>
            {term.canDownload && (
              <div className="term-hero__actions">
                <Button variant="secondary" onClick={() => download('pdf')}>
                  <Download size={16} /> PDF
                </Button>
                <Button variant="secondary" onClick={() => download('excel')}>
                  <FileSpreadsheet size={16} /> Excel
                </Button>
              </div>
            )}
          </div>
          <dl className="term-hero__facts">
            <HeroFact icon={Building2} label="Instituição compradora" value={term.buyerInstitution} />
            <HeroFact icon={Hash} label="Processo" value={term.processNumber} />
            <HeroFact
              icon={Package}
              label="Itens e cooperativas"
              value={`${term.items.length} ${term.items.length === 1 ? 'item' : 'itens'} · ${cooperativeCount} ${cooperativeCount === 1 ? 'cooperativa' : 'cooperativas'}`}
            />
            <HeroFact
              icon={CalendarCheck}
              label={term.signedAt ? 'Firmado em' : 'Última atualização'}
              value={formatWhen(term.signedAt ?? term.updatedAt)}
            />
          </dl>
        </div>
      </section>

      {term.versions.length > 1 && (
        <nav className="term-versions" aria-label="Versões do termo">
          <span className="term-versions__label">Versões</span>
          {term.versions.map((version) => (
            <Link
              key={version.id}
              to={`${base}/${version.id}`}
              aria-current={version.id === term.id ? 'page' : undefined}
              className={`term-version ${version.id === term.id ? 'term-version--active' : ''}`}
            >
              {version.status === 'SIGNED' ? <ShieldCheck size={14} /> : <PenLine size={14} />}
              v{version.version} · {version.status === 'SIGNED' ? 'Firmado' : 'Rascunho'}
            </Link>
          ))}
        </nav>
      )}

      {term.scope === 'division' && (
        <>
          <div className="term-notice term-notice--info">
            <span className="term-notice__icon">
              <Info size={18} />
            </span>
            <div>
              <p className="term-notice__title">Divisão liberada para consulta</p>
              <p className="term-notice__text">O rascunho completo deste termo ainda não está firmado.</p>
            </div>
          </div>
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
          <div className="term-stepper" role="tablist" aria-label="Etapas do termo">
            {steps.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={step === item.id}
                onClick={() => setStep(item.id)}
                className={`term-step ${step === item.id ? 'term-step--active' : ''}`}
              >
                <span className="term-step__index">{index + 1}</span>
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
