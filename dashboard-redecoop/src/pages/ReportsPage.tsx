import { useEffect, useMemo, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { cooperativeService, cooperativeLabel } from '@/services/cooperative.service'
import { productService } from '@/services/product.service'
import { reportService } from '@/services/misc.service'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ApiError } from '@/lib/api'
import { resolveStorageUrl } from '@/lib/storage'
import { ReportFilters, type ReportDefinition } from '@/types'

type FormState = {
  type: string
  cooperativeId: string
  productCategoryId: string
  startDate: string
  endDate: string
}

const EMPTY_FORM: FormState = {
  type: '',
  cooperativeId: '',
  productCategoryId: '',
  startDate: '',
  endDate: '',
}

export function ReportsPage() {
  const [reports, setReports] = useState<ReportDefinition[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [coops, setCoops] = useState<{ id: number; fantasyName?: string; companyName?: string; name?: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingReports, setLoadingReports] = useState(true)

  useEffect(() => {
    reportService
      .list()
      .then(setReports)
      .catch(() => toast.error('Erro ao carregar tipos de relatório'))
      .finally(() => setLoadingReports(false))
  }, [])

  const selectedReport = useMemo(
    () => reports.find((r) => r.type === form.type),
    [reports, form.type],
  )

  const needsCoop = selectedReport?.filters.some((f) => f.type === ReportFilters.COOPERATIVEID)
  const needsCategory = selectedReport?.filters.some((f) => f.type === ReportFilters.PRODUCTCATEGORYID)
  const needsPeriod = selectedReport?.filters.some((f) => f.type === ReportFilters.PERIOD)

  const coopRequired = selectedReport?.filters.find((f) => f.type === ReportFilters.COOPERATIVEID)?.required
  const categoryRequired = selectedReport?.filters.find((f) => f.type === ReportFilters.PRODUCTCATEGORYID)?.required
  const periodRequired = selectedReport?.filters.find((f) => f.type === ReportFilters.PERIOD)?.required

  useEffect(() => {
    if (!needsCoop) return
    cooperativeService.select().then(setCoops)
  }, [needsCoop])

  useEffect(() => {
    if (!needsCategory) return
    productService.categories().then(setCategories)
  }, [needsCategory])

  const onTypeChange = (type: string) => {
    setForm({
      type,
      cooperativeId: '',
      productCategoryId: '',
      startDate: '',
      endDate: '',
    })
  }

  const canSubmit = useMemo(() => {
    if (!form.type) return false
    if (coopRequired && !form.cooperativeId) return false
    if (categoryRequired && !form.productCategoryId) return false
    if (periodRequired && (!form.startDate || !form.endDate)) return false
    return true
  }, [form, coopRequired, categoryRequired, periodRequired])

  const handleGenerate = async () => {
    if (!canSubmit) return
    setLoading(true)
    toast.loading('Gerando relatório, aguarde...', { id: 'report' })
    try {
      const payload: Record<string, unknown> = { type: form.type }
      if (form.startDate) payload.startDate = form.startDate
      if (form.endDate) payload.endDate = form.endDate
      if (form.cooperativeId) payload.cooperativeId = Number(form.cooperativeId)
      if (form.productCategoryId) payload.productCategoryId = Number(form.productCategoryId)

      const result = await reportService.generate(payload)
      const url = resolveStorageUrl(`reports/${result.filename}`)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename || `relatorio-redecoop-${Date.now()}.xlsx`
      link.target = '_blank'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Relatório gerado!', { id: 'report' })
    } catch (err) {
      let message = 'Erro ao gerar relatório'
      if (err instanceof ApiError) {
        const data = err.data as { message?: string; errors?: Record<string, string[]> }
        const validation = data?.errors ? Object.values(data.errors).flat()[0] : undefined
        message = validation || data?.message || err.message
      } else if (err instanceof Error) {
        message = err.message
      }
      toast.error(message, { id: 'report' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reports-page">
      <PageHeader
        title="Relatórios"
        description="Gere relatórios consolidados da rede cooperativista."
      />

      <div className="panel-card reports-card">
        <div className="panel-card__body space-y-6">
          <section>
            <h3 className="reports-section__title">Qual o tipo de relatório?</h3>
            <hr className="reports-divider" />
            {loadingReports ? (
              <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
            ) : (
              <Select
                label="Relatório"
                value={form.type}
                onChange={(e) => onTypeChange(e.target.value)}
                placeholder="Selecione"
                options={reports.map((r) => ({ value: r.type, label: r.name }))}
              />
            )}
          </section>

          {selectedReport && (
            <section>
              <h3 className="reports-section__title">Filtros</h3>
              <hr className="reports-divider" />
              <div className="reports-filters">
                {needsCoop && (
                  <Select
                    label={`Cooperativa${coopRequired ? ' *' : ''}`}
                    value={form.cooperativeId}
                    onChange={(e) => setForm((f) => ({ ...f, cooperativeId: e.target.value }))}
                    placeholder="Selecione"
                    options={coops.map((c) => ({ value: c.id, label: cooperativeLabel(c) }))}
                  />
                )}
                {needsCategory && (
                  <Select
                    label={`Categoria produto${categoryRequired ? ' *' : ''}`}
                    value={form.productCategoryId}
                    onChange={(e) => setForm((f) => ({ ...f, productCategoryId: e.target.value }))}
                    placeholder="Selecione"
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  />
                )}
                {needsPeriod && (
                  <>
                    <Input
                      label={`Data início${periodRequired ? ' *' : ''}`}
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    />
                    <Input
                      label={`Data fim${periodRequired ? ' *' : ''}`}
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    />
                  </>
                )}
              </div>
            </section>
          )}

          <div className="flex items-center gap-3 rounded-xl bg-green-soft/50 p-4">
            <FileText className="text-green" size={24} />
            <p className="text-sm text-grey-dark">
              Escolha o tipo de relatório, preencha os filtros obrigatórios e clique em gerar.
            </p>
          </div>

          <Button onClick={handleGenerate} disabled={loading || !canSubmit} arrow>
            <Download size={16} />
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </Button>
        </div>
      </div>
    </div>
  )
}
