import { Button } from '@/components/ui/Button'
import type { TravelRoute } from '@/types'

interface ConfirmArrivalModalProps {
  open: boolean
  route: (TravelRoute & { lastRoute?: boolean }) | null
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmArrivalModal({
  open,
  route,
  onClose,
  onConfirm,
}: ConfirmArrivalModalProps) {
  if (!open || !route) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm border-0 cursor-pointer"
        aria-label="Fechar"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
        role="dialog"
        aria-labelledby="confirm-arrival-title"
        aria-modal="true"
      >
        <div className="app-stripe-bar">
          <div className="app-stripe-bar__green" />
          <div className="app-stripe-bar__yellow" />
          <div className="app-stripe-bar__mint" />
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 id="confirm-arrival-title" className="text-lg font-bold text-ink">
              Confirmar chegada
            </h2>
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-grey-dark shrink-0"
            >
              <span className="material-icons">close</span>
            </button>
          </div>

          <p className="text-sm text-grey-dark mb-1">Confirma que chegou em:</p>
          <p className="font-bold text-ink break-words mb-4">{route.address}</p>

          {route.lastRoute && (
            <div className="bg-green-soft rounded-xl px-4 py-3 mb-5">
              <p className="text-sm text-green-dark">
                <span className="material-icons text-[1rem] align-middle mr-1">flag</span>
                Última parada: ao confirmar, a viagem será <strong>concluída</strong>.
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button variant="outline" fullWidth onClick={onClose} className="sm:flex-1">
              Cancelar
            </Button>
            <Button fullWidth onClick={onConfirm} className="sm:flex-1">
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
