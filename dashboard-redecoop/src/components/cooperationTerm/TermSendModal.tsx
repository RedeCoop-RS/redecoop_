import { useState } from 'react'
import { Building2, Check, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { ApiError } from '@/lib/api'
import { cooperationTermService, type TermSendResult } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail, CooperationTermRecipient } from '@/types/cooperationTerm'

type SendKind = 'term' | 'division'

export function defaultTermMessage(term: Pick<CooperationTermDetail, 'name' | 'processNumber' | 'buyerInstitution'>): string {
  return [
    'Olá,',
    '',
    `A RedeCoop encaminha o termo de cooperação firmado ${term.name}, processo ${term.processNumber}, da instituição ${term.buyerInstitution}.`,
    '',
    'O documento, com o calendário de entregas, segue em anexo em PDF e Excel.',
  ].join('\n')
}

export function defaultDivisionMessage(term: Pick<CooperationTermDetail, 'name' | 'processNumber' | 'buyerInstitution'>): string {
  return [
    'Olá,',
    '',
    `A RedeCoop encaminha a planilha de divisão das quantidades do edital ${term.name}, processo ${term.processNumber}, da instituição ${term.buyerInstitution}.`,
    '',
    'A cota de cada cooperativa está na coluna Quantidade p/ cotação. Use a planilha para elaborar o projeto de venda. O calendário de entregas será definido na próxima reunião.',
  ].join('\n')
}

export function TermSendModal({
  open,
  kind,
  term,
  recipients,
  onClose,
  onSent,
}: {
  open: boolean
  kind: SendKind
  term: CooperationTermDetail
  recipients: CooperationTermRecipient[]
  onClose: () => void
  onSent: (term: CooperationTermDetail) => void
}) {
  const [message, setMessage] = useState(() => (kind === 'term' ? defaultTermMessage(term) : defaultDivisionMessage(term)))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TermSendResult | null>(null)

  const withEmail = recipients.filter((recipient) => recipient.email)
  const missing = recipients.filter((recipient) => !recipient.email)
  const finished = result !== null

  const send = async () => {
    if (!withEmail.length || sending) return
    setSending(true)
    setError('')
    try {
      const sent = kind === 'term'
        ? await cooperationTermService.send(term.id, message.trim())
        : await cooperationTermService.sendDivision(term.id, message.trim())
      setResult(sent)
      onSent(await cooperationTermService.get(term.id))
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível encaminhar.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={sending ? () => undefined : onClose} title={kind === 'term' ? 'Enviar termo' : 'Enviar divisão'} size="lg">
      <div className="space-y-4">
        <Textarea
          label="Mensagem para cada destinatário"
          value={message}
          maxLength={4000}
          rows={7}
          disabled={sending || finished}
          onChange={(event) => setMessage(event.target.value)}
        />
        <p className="text-sm text-grey-dark">O PDF e o Excel vão em anexo, com esta mensagem, para cada e-mail abaixo.</p>

        <ul className="term-recipients">
          {withEmail.map((recipient) => {
            const status = result?.results.find((item) => item.email === recipient.email && item.kind === recipient.kind)
            return (
              <li key={`${recipient.kind}-${recipient.email}`} className={`term-recipient ${recipient.kind === 'buyer' ? 'term-recipient--buyer' : ''}`}>
                <span className="term-recipient__avatar" aria-hidden="true">
                  {recipient.kind === 'buyer' ? <Building2 size={16} /> : initials(recipient.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="term-recipient__name">{recipient.name}</p>
                  <p className="term-recipient__email">{recipient.email}</p>
                  {status && !status.sent && <p className="term-send__reason">{status.detail}</p>}
                </div>
                <SendStatus sending={sending} status={status} />
              </li>
            )
          })}
          {missing.map((recipient) => (
            <li key={`${recipient.kind}-${recipient.name}`} className="term-recipient">
              <span className="term-recipient__avatar" aria-hidden="true">{initials(recipient.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="term-recipient__name">{recipient.name}</p>
                <p className="term-recipient__email term-recipient__email--missing">Sem e-mail cadastrado</p>
              </div>
              <span className="term-send__status term-send__status--skip">Não recebe</span>
            </li>
          ))}
        </ul>

        {error && <p className="text-sm text-red">{error}</p>}
        {result && <p className="text-sm text-ink">{result.detail}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>{finished ? 'Fechar' : 'Cancelar'}</Button>
          {!finished && (
            <Button onClick={send} disabled={sending || !message.trim() || withEmail.length === 0}>
              <Send size={16} /> {sending ? 'Encaminhando...' : 'Encaminhar'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function SendStatus({ sending, status }: { sending: boolean; status?: { sent: boolean } }) {
  if (sending && !status) return <span className="term-send__status">Enviando</span>
  if (!status) return null
  if (status.sent) {
    return <span className="term-send__status term-send__status--ok"><Check size={14} /> Enviado</span>
  }
  return <span className="term-send__status term-send__status--fail"><X size={14} /> Não enviado</span>
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}
