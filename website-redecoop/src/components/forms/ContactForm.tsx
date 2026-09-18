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

function contactErrorMessage(err: unknown) {
  if (!(err instanceof ApiError) || !err.data || typeof err.data !== 'object') {
    return 'Erro ao enviar mensagem. Tente novamente.'
  }
  const errors = (err.data as { errors?: Record<string, string> }).errors
  const first = errors ? Object.values(errors)[0] : undefined
  if (first?.includes('message must be longer')) {
    return 'A mensagem precisa ter pelo menos 10 caracteres.'
  }
  if (first?.includes('phone')) {
    return 'Informe um telefone válido (mínimo 8 dígitos).'
  }
  if (first?.includes('subject')) {
    return 'O assunto precisa ter pelo menos 5 caracteres.'
  }
  if (first?.includes('name')) {
    return 'O nome precisa ter pelo menos 3 caracteres.'
  }
  return first || err.message || 'Erro ao enviar mensagem. Tente novamente.'
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
      toast.error(contactErrorMessage(err))
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
          minLength={3}
          maxLength={100}
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
          required
          minLength={8}
          maxLength={20}
          placeholder="(51) 99999-9999"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label="Assunto"
          required
          minLength={5}
          maxLength={50}
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <div className="contact-form-full">
          <label className="text-sm font-medium text-grey-dark">Mensagem</label>
          <textarea
            required
            minLength={10}
            maxLength={1000}
            rows={5}
            placeholder="Mínimo 10 caracteres"
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
