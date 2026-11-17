import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { useModal } from '@/contexts/ModalContext'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail } from '@/types/cooperationTerm'
import { formatWhen } from './format'
import { AlertBox } from './TermCalendarStep'

interface TermSignStepProps {
  term: CooperationTermDetail
  basePath: string
  onChange: (term: CooperationTermDetail) => void
}

export function TermSignStep({ term, basePath, onChange }: TermSignStepProps) {
  const { confirm } = useModal()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const missingEmail = term.recipientsPreview.filter((recipient) => !recipient.email)
  const withEmail = term.recipientsPreview.filter((recipient) => recipient.email)

  const sign = async () => {
    const warning = term.alerts.length
      ? ` Há ${term.alerts.length} alerta(s) de calendário ou de soma.`
      : ''
    const ok = await confirm({
      title: 'Firmar termo',
      message: `O termo fica travado e somente leitura.${warning} Uma edição posterior gera uma nova versão e mantém esta no histórico.`,
      confirmLabel: 'Firmar',
    })
    if (!ok) return
    setBusy(true)
    try {
      const updated = await cooperationTermService.sign(term.id)
      onChange(updated)
      toast.success('Termo firmado.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível firmar o termo.')
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    const lines = withEmail.map((recipient) => `${recipient.name} (${recipient.email})`).join('; ')
    const skipped = missingEmail.length
      ? ` Sem e-mail, não recebem: ${missingEmail.map((recipient) => recipient.name).join(', ')}.`
      : ''
    const ok = await confirm({
      title: 'Enviar termo',
      message: withEmail.length
        ? `Enviar o PDF e o Excel para: ${lines}.${skipped}`
        : 'Não há destinatário com e-mail. Confira as cooperativas e a instituição compradora.',
      confirmLabel: 'Enviar agora',
    })
    if (!ok || !withEmail.length) return
    setBusy(true)
    try {
      const result = await cooperationTermService.send(term.id)
      const updated = await cooperationTermService.get(term.id)
      onChange(updated)
      if (result.sent) toast.success(result.detail)
      else toast.error(result.detail)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível enviar o termo.')
    } finally {
      setBusy(false)
    }
  }

  const newVersion = async () => {
    const ok = await confirm({
      title: 'Nova versão',
      message: 'A versão firmada permanece no histórico. A nova cópia abre como rascunho para edição.',
      confirmLabel: 'Criar rascunho',
    })
    if (!ok) return
    setBusy(true)
    try {
      const created = await cooperationTermService.newVersion(term.id)
      toast.success(`Versão ${created.version} criada.`)
      navigate(`${basePath}/${created.id}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível criar a nova versão.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <AlertBox alerts={term.alerts} />
      {term.status === 'DRAFT' ? (
        <section className="panel-card">
          <div className="panel-card__body space-y-3">
            <p className="text-sm text-grey-dark">
              Ao firmar, o termo vira a versão travada que as cooperativas passam a ver por inteiro, com download em PDF e Excel.
            </p>
            <Button onClick={sign} disabled={busy || term.items.length === 0}>Firmar termo</Button>
          </div>
        </section>
      ) : (
        <section className="panel-card">
          <div className="panel-card__body space-y-4">
            <p className="text-sm text-ink">
              Firmado em {formatWhen(term.signedAt)}. Esta versão é somente leitura.
            </p>
            <div>
              <p className="text-sm font-semibold text-ink">Destinatários</p>
              <ul className="mt-2 space-y-1 text-sm text-grey-dark">
                {term.recipientsPreview.map((recipient) => (
                  <li key={`${recipient.kind}-${recipient.name}`}>
                    {recipient.kind === 'buyer' ? 'Instituição' : 'Cooperativa'} · {recipient.name}
                    {recipient.email ? ` · ${recipient.email}` : ' · sem e-mail'}
                  </li>
                ))}
                {term.recipientsPreview.length === 0 && <li>Nenhum destinatário identificado.</li>}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={send} disabled={busy}>Enviar termo</Button>
              <Button variant="outline" onClick={newVersion} disabled={busy}>Editar em nova versão</Button>
            </div>
            {term.emailLogs.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-ink">Envios</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {term.emailLogs.map((log) => (
                    <li key={log.id} className="rounded-lg bg-surface px-3 py-2">
                      <span className="font-medium">{log.status === 'SENT' ? 'Enviado' : 'Não enviado'}</span>
                      <span className="text-grey-dark"> · {formatWhen(log.createdAt)}</span>
                      {log.detail && <p className="mt-1 text-grey-dark">{log.detail}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
