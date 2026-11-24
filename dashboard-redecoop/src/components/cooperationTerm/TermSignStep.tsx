import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Building2, FilePenLine, Send, ShieldCheck, Signature } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useModal } from '@/contexts/ModalContext'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail } from '@/types/cooperationTerm'
import { formatWhen } from './format'
import { TermSendModal } from './TermSendModal'

interface TermSignStepProps {
  term: CooperationTermDetail
  basePath: string
  onChange: (term: CooperationTermDetail) => void
}

export function TermSignStep({ term, basePath, onChange }: TermSignStepProps) {
  const { confirm } = useModal()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)

  const sign = async () => {
    const ok = await confirm({
      title: 'Firmar termo',
      message: 'O termo fica travado e somente leitura. Uma edição posterior gera uma nova versão e mantém esta no histórico.',
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
      {term.status === 'DRAFT' ? (
        <section className="term-panel">
          <header className="term-panel__header">
            <span className="term-panel__icon">
              <Signature size={18} />
            </span>
            <div>
              <p className="term-panel__title">Firmar o termo</p>
              <p className="term-panel__subtitle">
                Ao firmar, o termo vira a versão travada que as cooperativas passam a ver por inteiro, com download em PDF e Excel.
              </p>
            </div>
          </header>
          <footer className="term-panel__footer">
            <Button onClick={sign} disabled={busy || term.items.length === 0}>
              <ShieldCheck size={16} /> Firmar termo
            </Button>
          </footer>
        </section>
      ) : (
        <section className="term-panel">
          <header className="term-panel__header">
            <span className="term-panel__icon">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="term-panel__title">Versão firmada</p>
              <p className="term-panel__subtitle">
                Firmada em {formatWhen(term.signedAt)}. Esta versão é somente leitura.
              </p>
            </div>
          </header>
          <div className="term-panel__body">
            <div>
              <p className="term-panel__label">Destinatários do envio</p>
              {term.recipientsPreview.length === 0 ? (
                <p className="text-sm text-grey-dark">Nenhum destinatário identificado.</p>
              ) : (
                <ul className="term-recipients">
                  {term.recipientsPreview.map((recipient) => (
                    <li
                      key={`${recipient.kind}-${recipient.name}`}
                      className={`term-recipient ${recipient.kind === 'buyer' ? 'term-recipient--buyer' : ''}`}
                    >
                      <span className="term-recipient__avatar" aria-hidden="true">
                        {recipient.kind === 'buyer' ? <Building2 size={16} /> : initials(recipient.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="term-recipient__name">{recipient.name}</p>
                        <p className={`term-recipient__email ${recipient.email ? '' : 'term-recipient__email--missing'}`}>
                          {recipient.email ?? 'Sem e-mail cadastrado'}
                        </p>
                      </div>
                      <span className="term-pill term-pill--neutral">
                        {recipient.kind === 'buyer' ? 'Instituição' : 'Cooperativa'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {term.emailLogs.length > 0 && (
              <div>
                <p className="term-panel__label">Histórico de envios</p>
                <ul className="term-history">
                  {term.emailLogs.map((log) => (
                    <li key={log.id} className="term-history__entry">
                      <span className={`term-history__dot ${log.status === 'SENT' ? 'term-history__dot--ok' : ''}`} />
                      <div className="min-w-0">
                        <p className="term-history__title">
                          {log.kind === 'DIVISION' ? 'Planilha de divisão' : 'Termo firmado'} ·{' '}
                          {log.status === 'SENT' ? 'enviado' : 'não enviado'}
                          <span className="term-history__when">{formatWhen(log.createdAt)}</span>
                        </p>
                        {log.detail && <p className="term-history__detail">{log.detail}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <footer className="term-panel__footer">
            <Button variant="outline" onClick={newVersion} disabled={busy}>
              <FilePenLine size={16} /> Editar em nova versão
            </Button>
            <Button onClick={() => setSending(true)} disabled={busy}>
              <Send size={16} /> Enviar termo
            </Button>
          </footer>
        </section>
      )}
      {sending && (
        <TermSendModal
          open
          kind="term"
          term={term}
          recipients={term.recipientsPreview}
          onClose={() => setSending(false)}
          onSent={onChange}
        />
      )}
    </div>
  )
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
