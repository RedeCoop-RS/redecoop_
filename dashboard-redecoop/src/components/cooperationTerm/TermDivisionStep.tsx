import { useState } from 'react'
import toast from 'react-hot-toast'
import { Download, Eye, EyeOff, FileSpreadsheet, Info, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ApiError } from '@/lib/api'
import { cooperationTermService } from '@/services/cooperationTerm.service'
import type { CooperationTermDetail } from '@/types/cooperationTerm'
import { useModal } from '@/contexts/ModalContext'
import { formatQty, formatWhen, parseQty, sumsMatch } from './format'
import { TermSendModal } from './TermSendModal'

interface TermDivisionStepProps {
  term: CooperationTermDetail
  onChange: (term: CooperationTermDetail) => void
}

export function TermDivisionStep({ term, onChange }: TermDivisionStepProps) {
  const { confirm } = useModal()
  const [caps, setCaps] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    term.items.forEach((item) => {
      item.allocations.forEach((allocation) => {
        initial[`${item.id}:${allocation.cooperativeId}`] =
          allocation.maxCapacity === null ? '' : String(allocation.maxCapacity).replace('.', ',')
      })
    })
    return initial
  })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  const apply = async () => {
    const entries = term.items.flatMap((item) =>
      item.allocations.map((allocation) => {
        const raw = caps[`${item.id}:${allocation.cooperativeId}`] ?? ''
        return {
          itemId: item.id,
          cooperativeId: allocation.cooperativeId,
          maxCapacity: raw.trim() ? parseQty(raw) : null,
        }
      }),
    )
    if (entries.some((entry) => entry.maxCapacity === null && (caps[`${entry.itemId}:${entry.cooperativeId}`] ?? '').trim())) {
      toast.error('Há uma capacidade inválida. Use número maior ou igual a zero, ou deixe em branco para sem teto.')
      return
    }
    setSaving(true)
    try {
      const updated = await cooperationTermService.setCapacities(term.id, entries)
      onChange(updated)
      toast.success('Divisão recalculada.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível recalcular a divisão.')
    } finally {
      setSaving(false)
    }
  }

  const release = async (released: boolean) => {
    const ok = await confirm({
      title: released ? 'Liberar planilha' : 'Ocultar planilha',
      message: released
        ? 'As cooperativas participantes poderão ver esta divisão, somente leitura. O restante do rascunho continua oculto.'
        : 'As cooperativas deixam de ver a divisão deste rascunho.',
      confirmLabel: released ? 'Liberar' : 'Ocultar',
    })
    if (!ok) return
    try {
      onChange(await cooperationTermService.releaseDivision(term.id, released))
      toast.success(released ? 'Planilha liberada para as cooperativas.' : 'Planilha oculta.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível atualizar a liberação.')
    }
  }

  const hasInterest = term.items.some((item) => item.allocations.length > 0)
  const cooperativeRecipients = term.recipientsPreview.filter((recipient) => recipient.kind === 'cooperative')
  const lastSend = term.emailLogs.find((log) => log.kind === 'DIVISION')

  const download = async (kind: 'pdf' | 'excel') => {
    try {
      await cooperationTermService.downloadDivision(term.id, kind)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Não foi possível baixar a planilha.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="term-notice term-notice--info">
        <span className="term-notice__icon">
          <Info size={18} />
        </span>
        <div>
          <p className="term-notice__title">Divisão igualitária</p>
          <p className="term-notice__text">
            A quantidade de cada item é dividida em partes iguais. Se uma cooperativa informa um teto menor que a cota,
            fica com esse teto e o saldo é redistribuído igualmente entre as demais. Exemplo: 900 kg em três cotas de 300;
            se uma só pode 200, as outras duas ficam com 350.
          </p>
        </div>
      </div>

      {!hasInterest && (
        <div className="term-notice term-notice--warn">
          <span className="term-notice__icon">
            <Info size={18} />
          </span>
          <div>
            <p className="term-notice__title">Interesse ainda não marcado</p>
            <p className="term-notice__text">Marque o interesse das cooperativas para gerar a divisão.</p>
          </div>
        </div>
      )}

      <div className="panel-card">
        <div className="term-sheet">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Total</th>
              <th>Cooperativa</th>
              <th>Cota</th>
              <th>Capacidade máxima</th>
            </tr>
          </thead>
          <tbody>
            {term.items.map((item) => {
              const closed = sumsMatch(item.estimatedQuantity, item.allocations.map((allocation) => allocation.quantity))
              const rows = item.allocations.length ? item.allocations : [null]
              return rows.map((allocation, index) => (
                <tr key={`${item.id}-${allocation?.cooperativeId ?? 'empty'}`}>
                  <td>{index === 0 ? `${item.itemNumber}. ${item.description}` : ''}</td>
                  <td>
                    {index === 0 && (
                      <span className={closed ? '' : 'font-semibold text-red'}>
                        {formatQty(item.estimatedQuantity)}
                        {!closed && item.allocations.length > 0 ? ' · soma não fecha' : ''}
                      </span>
                    )}
                  </td>
                  <td>{allocation?.cooperativeName ?? '—'}</td>
                  <td>{allocation ? formatQty(allocation.quantity) : '—'}</td>
                  <td>
                    {allocation && (
                      <input
                        aria-label={`Capacidade máxima de ${allocation.cooperativeName} em ${item.description}`}
                        className="w-32 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green"
                        inputMode="decimal"
                        placeholder="Sem teto"
                        value={caps[`${item.id}:${allocation.cooperativeId}`] ?? ''}
                        onChange={(event) => setCaps({
                          ...caps,
                          [`${item.id}:${allocation.cooperativeId}`]: event.target.value,
                        })}
                      />
                    )}
                  </td>
                </tr>
              ))
            })}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={apply} disabled={saving || !hasInterest}>Aplicar tetos e recalcular</Button>
      </div>

      <section className="term-panel">
        <header className="term-panel__header">
          <span className="term-panel__icon">
            <Send size={18} />
          </span>
          <div>
            <p className="term-panel__title">Enviar às cooperativas para o projeto de venda</p>
            <p className="term-panel__subtitle">
              Com a divisão fechada, cada cooperativa recebe a planilha com a sua cota para elaborar o projeto. O calendário é
              definido depois, na segunda reunião.
            </p>
          </div>
        </header>
        <div className="term-panel__body">
          <div>
            <p className="term-panel__label">Cooperativas participantes</p>
            {cooperativeRecipients.length === 0 ? (
              <p className="text-sm text-grey-dark">Marque o interesse das cooperativas para montar a lista.</p>
            ) : (
              <ul className="term-recipients">
                {cooperativeRecipients.map((recipient) => (
                  <li key={recipient.name} className="term-recipient">
                    <span className="term-recipient__avatar" aria-hidden="true">
                      {recipient.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="term-recipient__name">{recipient.name}</p>
                      <p className={`term-recipient__email ${recipient.email ? '' : 'term-recipient__email--missing'}`}>
                        {recipient.email ?? 'Sem e-mail cadastrado'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {lastSend && (
            <p className="text-sm text-grey-dark">
              Último envio: {lastSend.status === 'SENT' ? 'enviado' : 'não enviado'} em {formatWhen(lastSend.createdAt)}
              {lastSend.detail ? ` · ${lastSend.detail}` : ''}
            </p>
          )}
        </div>
        <footer className="term-panel__footer">
          <Button variant="outline" onClick={() => release(!term.divisionReleased)}>
            {term.divisionReleased ? <EyeOff size={16} /> : <Eye size={16} />}
            {term.divisionReleased ? 'Ocultar no painel das cooperativas' : 'Mostrar no painel das cooperativas'}
          </Button>
          <Button variant="secondary" onClick={() => download('pdf')} disabled={!hasInterest}>
            <Download size={16} /> PDF
          </Button>
          <Button variant="secondary" onClick={() => download('excel')} disabled={!hasInterest}>
            <FileSpreadsheet size={16} /> Excel
          </Button>
          <Button onClick={() => setSending(true)} disabled={!hasInterest}>
            <Send size={16} /> Enviar divisão
          </Button>
        </footer>
      </section>
      {sending && (
        <TermSendModal
          open
          kind="division"
          term={term}
          recipients={cooperativeRecipients}
          onClose={() => setSending(false)}
          onSent={onChange}
        />
      )}
    </div>
  )
}
