import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { faqService } from '@/services/misc.service'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FaqModal } from '@/components/modals/BusinessModals'
import { useAuth } from '@/contexts/AuthContext'
import { useModal } from '@/contexts/ModalContext'
import type { FaqItem } from '@/types'

export function FaqPage() {
  const { isAdmin } = useAuth()
  const { confirm } = useModal()
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<number | null>(null)
  const [editItem, setEditItem] = useState<FaqItem | null | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await faqService.list(1, 100)
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (item: FaqItem) => {
    const ok = await confirm({ message: 'Excluir esta pergunta?', variant: 'danger' })
    if (!ok) return
    try {
      await faqService.delete(item.id)
      toast.success('Pergunta excluída!')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro')
    }
  }

  return (
    <div>
      <PageHeader
        title="FAQ"
        description="Perguntas frequentes sobre o painel e a RedeCoop."
        actions={
          isAdmin ? (
            <Button onClick={() => setEditItem(null)}>
              <Plus size={16} />
              Nova pergunta
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
          ))
        ) : items.length === 0 ? (
          <div className="panel-card">
            <EmptyState title="Nenhuma pergunta cadastrada" />
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="panel-card overflow-hidden">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setOpenId(openId === item.id ? null : item.id)}
                  className="flex flex-1 items-center justify-between px-5 py-4 text-left transition-colors hover:bg-green-soft/20"
                >
                  <span className="font-semibold text-ink">
                    {item.question ?? item.title}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-green transition-transform ${openId === item.id ? 'rotate-180' : ''}`}
                  />
                </button>
                {isAdmin && (
                  <div className="flex gap-1 pr-3">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-green hover:bg-green/10"
                      onClick={() => setEditItem(item)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-red hover:bg-red/10"
                      onClick={() => remove(item)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              {openId === item.id && (
                <div className="border-t border-gray-100 px-5 py-4 text-sm text-grey-dark">
                  {item.answer ?? item.content}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <FaqModal
        open={editItem !== undefined}
        item={editItem}
        onClose={() => setEditItem(undefined)}
        onSaved={load}
      />
    </div>
  )
}
