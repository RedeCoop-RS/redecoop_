import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { publicService } from '@/services/public.service'
import { ApiError } from '@/lib/api'

interface ContactFormProps {
  showHeader?: boolean
}

export function ContactForm({ showHeader = true }: ContactFormProps) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await publicService.sendContact(form)
      toast.success('Mensagem enviada com sucesso!')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {showHeader && (
        <>
          <h3 className="text-2xl font-bold text-ink mb-1">Fale conosco</h3>
          <p className="text-sm text-grey-dark mb-6">Envie sua mensagem e retornaremos em breve.</p>
        </>
      )}

      <div className="contact-form-fields">
        <Input
          label="Nome"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
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
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Assunto"
          required
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <div className="contact-form-full">
          <label className="text-sm font-medium text-grey-dark">Mensagem</label>
          <textarea
            required
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
      </div>

      <div className="contact-form-card__footer">
        <span className="contact-form-card__required">Campos obrigatórios *</span>
        <Button type="submit" disabled={loading} arrow className="w-full sm:w-auto">
          <Send size={16} />
          {loading ? 'Enviando...' : 'Enviar mensagem'}
        </Button>
      </div>
    </form>
  )
}
