import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Loader2, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { notify } from '@/lib/notify'
import {
  mailboxErrorMessage,
  mailboxService,
  type MailAuditEntry,
  type MailboxAccountView,
  type SaveAccountInput,
} from '@/services/mailbox.service'
import { DEFAULT_MAIL_PRESET, detectPreset, MAIL_PRESETS, presetById, type MailPresetId } from './presets'

interface MailboxSettingsProps {
  account: MailboxAccountView | null
  onClose?: () => void
  onSaved: (account: MailboxAccountView) => void
}

interface FormState {
  preset: MailPresetId
  label: string
  email: string
  displayName: string
  imapHost: string
  imapPort: number
  imapSecure: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  username: string
  password: string
  signatureHtml: string
  syncIntervalSeconds: number
}

const HOSTINGER = presetById('hostinger')!

function blankForm(): FormState {
  return {
    preset: DEFAULT_MAIL_PRESET,
    label: 'Caixa principal',
    email: '',
    displayName: 'RedeCoop',
    imapHost: HOSTINGER.imapHost,
    imapPort: HOSTINGER.imapPort,
    imapSecure: HOSTINGER.imapSecure,
    smtpHost: HOSTINGER.smtpHost,
    smtpPort: HOSTINGER.smtpPort,
    smtpSecure: HOSTINGER.smtpSecure,
    username: '',
    password: '',
    signatureHtml: '',
    syncIntervalSeconds: 60,
  }
}

function fromAccount(account: MailboxAccountView | null): FormState {
  if (!account?.configured) return blankForm()
  const preset = detectPreset(account)
  return {
    preset,
    label: account.label || 'Caixa principal',
    email: account.email || '',
    displayName: account.displayName || '',
    imapHost: account.imapHost || HOSTINGER.imapHost,
    imapPort: account.imapPort || HOSTINGER.imapPort,
    imapSecure: account.imapSecure ?? true,
    smtpHost: account.smtpHost || HOSTINGER.smtpHost,
    smtpPort: account.smtpPort || HOSTINGER.smtpPort,
    smtpSecure: account.smtpSecure ?? true,
    username: account.username || account.email || '',
    password: '',
    signatureHtml: account.signatureHtml || '',
    syncIntervalSeconds: account.syncIntervalSeconds || 60,
  }
}

function connectionKey(form: FormState) {
  return JSON.stringify({
    email: form.email.trim(),
    imapHost: form.imapHost.trim(),
    imapPort: form.imapPort,
    imapSecure: form.imapSecure,
    smtpHost: form.smtpHost.trim(),
    smtpPort: form.smtpPort,
    smtpSecure: form.smtpSecure,
    username: form.username.trim(),
    password: form.password,
  })
}

export function MailboxSettings({ account, onClose, onSaved }: MailboxSettingsProps) {
  const [form, setForm] = useState<FormState>(() => fromAccount(account))
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testedKey, setTestedKey] = useState<string | null>(null)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [audit, setAudit] = useState<MailAuditEntry[]>([])
  const locked = form.preset !== 'custom'
  const activePreset = presetById(form.preset)

  useEffect(() => {
    setForm(fromAccount(account))
    setTestedKey(null)
    setTestMessage(null)
  }, [account])

  useEffect(() => {
    if (!account?.configured) return
    void mailboxService.audit(1).then((result) => setAudit(result.data)).catch(() => setAudit([]))
  }, [account?.configured])

  const readyToSave = useMemo(() => testedKey === connectionKey(form), [testedKey, form])

  function patch(partial: Partial<FormState>) {
    setForm((current) => {
      const next = { ...current, ...partial }
      if (next.preset !== 'custom' && presetById(next.preset)?.usernameIsEmail && 'email' in partial) {
        next.username = next.email.trim()
      }
      return next
    })
    setTestMessage(null)
  }

  function choosePreset(preset: MailPresetId) {
    const values = presetById(preset)
    setForm((current) => {
      if (!values) return { ...current, preset: 'custom' }
      return {
        ...current,
        preset,
        imapHost: values.imapHost,
        imapPort: values.imapPort,
        imapSecure: values.imapSecure,
        smtpHost: values.smtpHost,
        smtpPort: values.smtpPort,
        smtpSecure: values.smtpSecure,
        username: values.usernameIsEmail ? current.email.trim() : current.username,
      }
    })
    setTestedKey(null)
    setTestMessage(null)
  }

  function payload(): SaveAccountInput {
    return {
      label: form.label.trim() || 'Caixa principal',
      email: form.email.trim(),
      displayName: form.displayName.trim(),
      imapHost: form.imapHost.trim(),
      imapPort: Number(form.imapPort),
      imapSecure: form.imapSecure,
      smtpHost: form.smtpHost.trim(),
      smtpPort: Number(form.smtpPort),
      smtpSecure: form.smtpSecure,
      username: form.username.trim(),
      password: form.password.trim() || undefined,
      signatureHtml: form.signatureHtml.trim() || undefined,
      syncIntervalSeconds: Number(form.syncIntervalSeconds) || 60,
    }
  }

  function validate(): string | null {
    if (!form.email.trim()) return 'Informe o e-mail da caixa.'
    if (!form.username.trim()) return 'Informe o usuário. Na Hostinger ele é o e-mail completo.'
    if (!account?.hasPassword && !form.password.trim()) return 'Informe a senha da caixa para testar a conexão.'
    if (!form.imapHost.trim() || !form.smtpHost.trim()) return 'Informe os servidores IMAP e SMTP.'
    return null
  }

  async function testConnection() {
    const problem = validate()
    if (problem) {
      notify.error(problem)
      setTestMessage(problem)
      return false
    }
    setTesting(true)
    setTestMessage(null)
    try {
      const body = payload()
      const result = await mailboxService.testConnection({
        email: body.email,
        imapHost: body.imapHost,
        imapPort: body.imapPort,
        imapSecure: body.imapSecure,
        smtpHost: body.smtpHost,
        smtpPort: body.smtpPort,
        smtpSecure: body.smtpSecure,
        username: body.username,
        password: body.password,
      })
      setTestedKey(connectionKey(form))
      setTestMessage(result.message)
      notify.success(result.message)
      return true
    } catch (error) {
      const message = mailboxErrorMessage(error)
      setTestedKey(null)
      setTestMessage(message)
      notify.error(message)
      return false
    } finally {
      setTesting(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const verified = readyToSave || (await testConnection())
      if (!verified) return
      const saved = await mailboxService.saveAccount(payload())
      notify.success('Caixa de e-mail salva.')
      onSaved(saved)
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!window.confirm('Remover a caixa de e-mail deste painel? A senha salva será apagada.')) return
    try {
      await mailboxService.deleteAccount()
      notify.success('Caixa removida.')
      onSaved({ configured: false, hasPassword: false, unread: 0 })
    } catch (error) {
      notify.error(mailboxErrorMessage(error))
    }
  }

  return (
    <section className="mailbox-settings" aria-label="Configuração da caixa de e-mail">
      <header className="mailbox-settings__header">
        <div>
          <p className="page-kicker">Super administrador</p>
          <h2>Conexão da caixa</h2>
          <p>A senha fica criptografada no servidor com MAILBOX_ENCRYPTION_KEY e não volta para o navegador.</p>
        </div>
        {onClose && account?.configured && (
          <button type="button" className="mailbox-icon-btn" onClick={onClose} aria-label="Fechar configurações">
            <X size={18} />
          </button>
        )}
      </header>

      <form onSubmit={save} className="mailbox-settings__form">
        <div className="mailbox-presets" role="radiogroup" aria-label="Provedor">
          {MAIL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={form.preset === preset.id}
              className={`mailbox-preset ${form.preset === preset.id ? 'mailbox-preset--active' : ''}`}
              onClick={() => choosePreset(preset.id)}
            >
              <strong>{preset.label}</strong>
              {preset.id === 'hostinger' && <span>Padrão</span>}
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={form.preset === 'custom'}
            className={`mailbox-preset ${form.preset === 'custom' ? 'mailbox-preset--active' : ''}`}
            onClick={() => choosePreset('custom')}
          >
            <strong>Personalizado</strong>
            <span>Manual</span>
          </button>
        </div>
        <p className="mailbox-settings__hint">
          {activePreset?.hint || 'Informe host, porta e TLS manualmente. Vale para qualquer provedor com IMAP e SMTP.'}
        </p>

        <div className="mailbox-settings__grid">
          <Input label="E-mail da caixa" type="email" value={form.email} onChange={(event) => patch({ email: event.target.value })} required placeholder="contato@seudominio.com" />
          <Input label="Nome de exibição" value={form.displayName} onChange={(event) => patch({ displayName: event.target.value })} />
          <Input
            label="Usuário"
            value={form.username}
            onChange={(event) => patch({ username: event.target.value })}
            readOnly={Boolean(activePreset?.usernameIsEmail)}
            placeholder="O e-mail completo"
          />
          <Input
            label={account?.hasPassword ? 'Senha (em branco mantém a atual)' : 'Senha'}
            type="password"
            value={form.password}
            autoComplete="new-password"
            onChange={(event) => patch({ password: event.target.value })}
          />
          <Input label="Servidor IMAP" value={form.imapHost} disabled={locked} onChange={(event) => patch({ imapHost: event.target.value })} />
          <Input label="Porta IMAP" type="number" value={form.imapPort} disabled={locked} onChange={(event) => patch({ imapPort: Number(event.target.value) })} />
          <Input label="Servidor SMTP" value={form.smtpHost} disabled={locked} onChange={(event) => patch({ smtpHost: event.target.value })} />
          <Input label="Porta SMTP" type="number" value={form.smtpPort} disabled={locked} onChange={(event) => patch({ smtpPort: Number(event.target.value) })} />
        </div>

        <div className="mailbox-settings__checks">
          <label>
            <input type="checkbox" checked={form.imapSecure} disabled={locked} onChange={(event) => patch({ imapSecure: event.target.checked })} />
            IMAP com SSL/TLS
          </label>
          <label>
            <input type="checkbox" checked={form.smtpSecure} disabled={locked} onChange={(event) => patch({ smtpSecure: event.target.checked })} />
            SMTP com SSL
          </label>
        </div>
        {form.preset === 'hostinger' && (
          <p className="mailbox-settings__servers">
            IMAP imap.hostinger.com:993 SSL/TLS · SMTP smtp.hostinger.com:465 SSL
          </p>
        )}
        {form.preset === 'custom' && (
          <p className="mailbox-settings__hint">Desmarque SSL para STARTTLS, em geral nas portas 143 (IMAP) e 587 (SMTP).</p>
        )}

        <label className="mailbox-settings__signature">
          <span>Assinatura</span>
          <textarea
            value={form.signatureHtml}
            onChange={(event) => patch({ signatureHtml: event.target.value })}
            rows={4}
            placeholder="Texto ou HTML simples incluído ao enviar."
          />
        </label>

        {testMessage && (
          <p className={`mailbox-settings__status ${readyToSave ? 'mailbox-settings__status--ok' : 'mailbox-settings__status--bad'}`} role="status">
            {testMessage}
          </p>
        )}

        <div className="mailbox-settings__actions">
          <Button type="button" variant="outline" onClick={() => void testConnection()} disabled={testing || saving}>
            {testing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            Testar conexão
          </Button>
          <Button type="submit" disabled={testing || saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          {account?.configured && (
            <Button type="button" variant="danger" onClick={() => void remove()}>
              Remover caixa
            </Button>
          )}
        </div>
        <p className="mailbox-settings__hint">Salvar testa IMAP e SMTP de novo se a conexão ainda não foi verificada com estes dados.</p>
      </form>

      {audit.length > 0 && (
        <div className="mailbox-audit">
          <h3>Histórico de envios</h3>
          <ul>
            {audit.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.subject || '(sem assunto)'}</strong>
                <span>{entry.recipients}</span>
                <time>{new Date(entry.createdAt).toLocaleString('pt-BR')}</time>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
