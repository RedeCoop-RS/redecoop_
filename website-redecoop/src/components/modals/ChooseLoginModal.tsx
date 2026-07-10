import { Users, Building2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useModal } from '@/contexts/ModalContext'

export function ChooseLoginModal() {
  const { modal, openModal, closeModal } = useModal()

  return (
    <Modal open={modal.type === 'choose-login'} onClose={closeModal} title="Como deseja acessar?">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => openModal('login', { typeUser: 'customer', redirectToCooperatives: true })}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gray-100 p-6 hover:border-green hover:bg-green/5 transition-all group"
        >
          <div className="rounded-full bg-green/10 p-4 group-hover:bg-green/20 transition-colors">
            <Users className="text-green" size={32} />
          </div>
          <span className="font-semibold text-ink">Consumidor</span>
          <span className="text-xs text-grey text-center">
            Acesse o catálogo de produtos das cooperativas
          </span>
        </button>

        <button
          onClick={() => openModal('login', { typeUser: 'cooperative' })}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gray-100 p-6 hover:border-green hover:bg-green/5 transition-all group"
        >
          <div className="rounded-full bg-green/10 p-4 group-hover:bg-green/20 transition-colors">
            <Building2 className="text-green" size={32} />
          </div>
          <span className="font-semibold text-ink">Cooperativa</span>
          <span className="text-xs text-grey text-center">
            Acesse o painel de gestão da cooperativa
          </span>
        </button>
      </div>
    </Modal>
  )
}
