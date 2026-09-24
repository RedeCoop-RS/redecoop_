import { useState, type FormEvent, type ChangeEvent } from 'react'
import { Paperclip, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { publicService } from '@/services/public.service'

export function BudgetForm() {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 5)
    setFiles(selected)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('email', email)
      formData.append('phone', phone)
      formData.append('subject', subject)
      formData.append('message', message)
      files.forEach((f) => formData.append('files', f))
      await publicService.sendBudgetEmail(formData)
      toast.success('Orçamento enviado com sucesso!')
      setName('')
      setEmail('')
      setPhone('')
      setSubject('')
      setMessage('')
      setFiles([])
    } catch {
      toast.error('Erro ao enviar orçamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 md:p-8 shadow-xl">
      <h3 className="text-2xl font-bold text-ink mb-1">Solicitar orçamento</h3>
      <p className="text-sm text-grey-dark mb-6">
        Envie sua solicitação de orçamento para as cooperativas.
      </p>

      <div className="space-y-4">
        <Input
          label="Nome"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Telefone"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          label="Assunto"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <div>
          <label className="text-sm font-medium text-grey-dark">Mensagem</label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/20"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-grey-dark cursor-pointer">
            <Paperclip size={16} />
            Anexar arquivos (máx. 5, 2MB cada)
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFiles}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </label>
          {files.length > 0 && (
            <p className="mt-1 text-xs text-grey">{files.map((f) => f.name).join(', ')}</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Button type="submit" disabled={loading} arrow>
          <Send size={16} />
          {loading ? 'Enviando...' : 'Enviar orçamento'}
        </Button>
      </div>
    </form>
  )
}
