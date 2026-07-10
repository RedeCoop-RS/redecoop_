import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { businessService } from '@/services/business.service'
import { faqService } from '@/services/misc.service'
import { ChatPanel } from '@/components/chat/ChatPanel'
import type { Business, FaqItem } from '@/types'

export {
  CollectivePurchaseModal,
  StartCollectivePurchaseModal,
  BusinessDeskModal,
  StartBusinessDeskModal,
} from './OpportunityModals'

export function BusinessChangeValueModal({
  open,
  business,
  onClose,
  onSaved,
}: {
  open: boolean
  business: Business | null
  onClose: () => void
  onSaved: () => void
}) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (business) {
      const fee = business.fee ?? business.value
      setValue(fee != null ? String(fee) : '')
    }
  }, [business])

  const save = async () => {
    if (!business) return
    setSaving(true)
    try {
      await businessService.updateValue(business.id, Number(value))
      toast.success('Valor atualizado!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Alterar valor do negócio" size="sm">
      <Input label="Novo valor (R$)" type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={save} disabled={saving}>Salvar</Button>
      </div>
    </Modal>
  )
}

export function FaqModal({
  open,
  item,
  onClose,
  onSaved,
}: {
  open: boolean
  item?: FaqItem | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setTitle(item.question ?? item.title ?? '')
      setContent(item.answer ?? item.content ?? '')
    } else {
      setTitle('')
      setContent('')
    }
  }, [item, open])

  const save = async () => {
    setSaving(true)
    try {
      const data = { title, content }
      if (item) await faqService.update(item.id, data)
      else await faqService.create(data)
      toast.success('FAQ salvo!')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={item ? 'Editar pergunta' : 'Nova pergunta'}>
      <div className="space-y-4">
        <Input label="Pergunta" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Resposta" value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}

export function ChatMessageModal({
  open,
  title,
  conversationId,
  onClose,
}: {
  open: boolean
  title: string
  conversationId: number | null
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      {conversationId ? (
        <div className="min-h-[480px]">
          <ChatPanel conversationId={conversationId} />
        </div>
      ) : null}
    </Modal>
  )
}
