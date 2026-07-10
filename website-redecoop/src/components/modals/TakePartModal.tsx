import { useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useModal } from '@/contexts/ModalContext'
import { publicService } from '@/services/public.service'

export function TakePartModal() {
  const { modal, closeModal } = useModal()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    cnpj: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await publicService.createRequest(form)
      toast.success('Solicitação enviada! Entraremos em contato em breve.')
      closeModal()
      setForm({ name: '', email: '', phone: '', address: '', cnpj: '' })
    } catch {
      toast.error('Erro ao enviar solicitação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={modal.type === 'take-part'} onClose={closeModal} title="Quero fazer parte!" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-grey-dark">
          Preencha os dados da sua cooperativa e entraremos em contato.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nome da cooperativa"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="CNPJ"
            required
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
          />
          <Input
            label="E-mail"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Telefone"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <Input
          label="Endereço"
          required
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <Button type="submit" disabled={loading} arrow className="w-full">
          {loading ? 'Enviando...' : 'Enviar solicitação'}
        </Button>
      </form>
    </Modal>
  )
}
